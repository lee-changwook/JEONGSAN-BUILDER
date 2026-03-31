import type {
  ValidatorStrategy,
  ValidationResult,
  ValidationContext,
  ValidationFinding,
  FindingSeverity,
  FindingScope,
  CellHighlight,
} from '../validator-strategy.type';
import {
  SueopAggregateInputSchema,
  BILLABLE_CATEGORIES,
  type SueopAggregateInput,
  type SueopAggregateDerived,
  type SueopAggregateReport,
  type Sugangsaeng,
  type SugangsaengAnalysisRow,
  type AttendanceCell,
  type SueomnyoTimingDetail,
  type SueopSummary,
  type AmountBreakdown,
  type AmountBreakdownLine,
  type EnrollmentContext,
} from '../sueop-aggregate/sueop-aggregate.validator-strategy.type';

type Ctx = ValidationContext<SueopAggregateInput, SueopAggregateDerived>;

// ─── Amount Guess Result ────────────────────────────────────────────────────

type AmountGuess = {
  guessedHoechaCount: number;
  hasTextbook: boolean;
  sessionAmount: number;
  textbookAmount: number;
  guessedTotal: number;
  isExactMatch: boolean;
};

export class SueopAggregateCompatValidatorStrategyImpl
  implements ValidatorStrategy<SueopAggregateInput, SueopAggregateReport>
{
  // ─── Singleton ───────────────────────────────────────────────────────────

  private static instance: SueopAggregateCompatValidatorStrategyImpl;

  private constructor() {}

  public static getInstance(): SueopAggregateCompatValidatorStrategyImpl {
    if (!SueopAggregateCompatValidatorStrategyImpl.instance) {
      SueopAggregateCompatValidatorStrategyImpl.instance =
        new SueopAggregateCompatValidatorStrategyImpl();
    }
    return SueopAggregateCompatValidatorStrategyImpl.instance;
  }

  // ─── Interface: checkInput ───────────────────────────────────────────────

  public checkInput(rawInput: unknown): ValidationResult<SueopAggregateInput> {
    const parsed = SueopAggregateInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Input schema validation failed',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          rule: 'schema',
          message: issue.message,
        })),
      };
    }
    return { success: true, payload: parsed.data };
  }

  // ─── Interface: process ──────────────────────────────────────────────────

  public process(input: SueopAggregateInput): SueopAggregateReport {
    const ctx: Ctx = {
      input,
      findings: [],
      derived: {
        sueopBoonMap: new Map(input.sueop.boons.map((b) => [b.nanoId, b])),
        sueopKonMap: new Map(input.sueop.kons.map((k) => [k.nanoId, k])),
      },
    };

    // Phase 1: Basic structural checks (limited in compat mode)
    this.phase1_checkBasicStructure(ctx);

    // Phase 2: Amount guess validation (core compat feature)
    for (const sg of input.sugangsaengs) {
      this.phase2_validateAmountGuess(ctx, sg);
    }

    // Phase 3: Attendance vs amount cross-check
    for (const sg of input.sugangsaengs) {
      this.phase3_checkAttendanceVsAmount(ctx, sg);
    }

    // Phase 4: Cross-sugangsaeng anomalies
    this.phase4_crossSugangsaengChecks(ctx);

    return this.buildReport(ctx);
  }

  // ─── Interface: run ──────────────────────────────────────────────────────

  public run(rawInput: unknown): ValidationResult<SueopAggregateReport> {
    const inputResult = this.checkInput(rawInput);
    if (!inputResult.success) {
      return inputResult;
    }
    return { success: true, payload: this.process(inputResult.payload) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 1: Basic Structure (compat)
  // ═══════════════════════════════════════════════════════════════════════════

  private phase1_checkBasicStructure(ctx: Ctx): void {
    if (ctx.input.sueop.amount === null || ctx.input.sueop.amount === 0) {
      this.addFinding(ctx, 'error', 'structure', 'sueop.amount',
        '회차당 수강료가 설정되지 않음',
        '금액 검증을 위해 회차당 수강료가 필요합니다.',
      );
    }

    if (ctx.input.sugangsaengs.length === 0) {
      this.addFinding(ctx, 'error', 'structure', 'sugangsaengs',
        '수강생 데이터가 없음',
        'CSV에서 수강생 데이터를 파싱하지 못했습니다.',
      );
    }

    if (ctx.input.sueop.boons.length === 0) {
      this.addFinding(ctx, 'error', 'structure', 'sueop.boons',
        '회차(분) 데이터가 없음',
        'CSV에서 날짜 컬럼을 파싱하지 못했습니다.',
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 2: Amount Guess Validation (core compat logic)
  // ═══════════════════════════════════════════════════════════════════════════

  private phase2_validateAmountGuess(ctx: Ctx, sg: Sugangsaeng): void {
    const sgScope: FindingScope = { sugangsaengNanoId: sg.nanoId };
    const sessionAmount = ctx.input.sueop.amount ?? 0;
    if (sessionAmount === 0) return;

    const chugaKon = ctx.input.sueop.kons.find((k) => k.konCategory === 'chuga-cheonggu');
    const textbookAmount = chugaKon?.gibonBoonAmount ?? 0;

    const activeBubuns = sg.connectedSueomnyos.flatMap((s) =>
      s.bubunCheonggus.filter((b) => !b.isChwiso),
    );
    const totalNabip = activeBubuns.reduce((s, b) => s + b.nabipAmount, 0);
    const totalMinap = activeBubuns.reduce((s, b) => s + b.minapAmount, 0);
    const totalAmount = totalNabip + totalMinap;
    const harinAmount = activeBubuns.reduce((s, b) => s + b.harinAmount, 0);
    const preDiscountAmount = totalAmount + harinAmount;

    if (totalAmount === 0) {
      return;
    }

    const billableCount = sg.connectedChulseokWorkBranches.filter((cwb) =>
      BILLABLE_CATEGORIES.includes(cwb.hVector.hVectorHwaginCategory),
    ).length;

    // Try guessing on pre-discount amount first (if harin exists), then on actual total
    const guessTarget = harinAmount > 0 ? preDiscountAmount : totalAmount;
    const guess = this.guessAmountBreakdown(guessTarget, sessionAmount, textbookAmount);

    const harinSuffix = harinAmount > 0 ? ` − 할인 ${harinAmount.toLocaleString()}` : '';

    if (guess === null) {
      // Plain guess failed — try guessing with common discount rates (10%, 20%, 30%, ...)
      const harinGuess = this.guessWithHarinRate(totalAmount, sessionAmount, textbookAmount);

      if (harinGuess) {
        this.addFinding(ctx, 'error', 'amount-guess', 'sugangsaeng.amount',
          `금액 구성을 추정할 수 없음`,
          `납입+미납 ${totalAmount.toLocaleString()}원을\n회차당 ${sessionAmount.toLocaleString()}원${textbookAmount > 0 ? ` + 교재비 ${textbookAmount.toLocaleString()}원` : ''}으로 설명할 수 없습니다.`,
          {
            scope: sgScope,
            evidence: { totalAmount, sessionAmount, textbookAmount, billableCount, guessedHarinRate: harinGuess.rate },
            suggestion: `할인율 ${harinGuess.rate}%가 적용된 것은 아닌지 확인하세요.\n할인 전 ${harinGuess.preDiscount.toLocaleString()}원 = ${sessionAmount.toLocaleString()} × ${harinGuess.guess.guessedHoechaCount}회${harinGuess.guess.hasTextbook ? ' + 교재비' : ''}`,
          },
        );
      } else {
        this.addFinding(ctx, 'error', 'amount-guess', 'sugangsaeng.amount',
          `금액 구성을 추정할 수 없음`,
          `납입+미납 ${totalAmount.toLocaleString()}원을\n회차당 ${sessionAmount.toLocaleString()}원${textbookAmount > 0 ? ` + 교재비 ${textbookAmount.toLocaleString()}원` : ''}${harinAmount > 0 ? `\n(할인 전 ${preDiscountAmount.toLocaleString()}원)` : ''}으로 설명할 수 없습니다.`,
          {
            scope: sgScope,
            evidence: { totalAmount, preDiscountAmount, harinAmount, sessionAmount, textbookAmount, billableCount },
          },
        );
      }
      return;
    }

    if (guess.isExactMatch && guess.guessedHoechaCount === billableCount) {
      // Exact match — captured in amountBreakdown.explanation, not as a finding
      return;
    }

    if (guess.isExactMatch && guess.guessedHoechaCount !== billableCount) {
      this.addFinding(ctx, 'error', 'amount-guess', 'sugangsaeng.amount',
        `납입 회차(${guess.guessedHoechaCount})와 출결 수(${billableCount}) 불일치`,
        `${totalAmount.toLocaleString()}원 = ${sessionAmount.toLocaleString()} × ${guess.guessedHoechaCount}회${guess.hasTextbook ? ' + 교재비' : ''}${harinSuffix}`,
        {
          scope: sgScope,
          evidence: { ...guess, billableCount, harinAmount },
          suggestion: guess.guessedHoechaCount > billableCount
            ? `출결이 ${guess.guessedHoechaCount - billableCount}건 누락되었을 수 있습니다.\n이전 달 동영상 수강분이 포함되었을 수 있습니다.`
            : `출결이 ${billableCount - guess.guessedHoechaCount}건 초과입니다.\n수강료가 부족할 수 있습니다.`,
        },
      );
      return;
    }
  }

  // ─── Amount Guess Algorithm ──────────────────────────────────────────────

  private guessAmountBreakdown(
    targetAmount: number,
    sessionAmount: number,
    textbookAmount: number,
  ): AmountGuess | null {
    if (sessionAmount <= 0) return null;

    const variants = textbookAmount > 0
      ? [
          { hasTextbook: true, base: targetAmount - textbookAmount },
          { hasTextbook: false, base: targetAmount },
        ]
      : [{ hasTextbook: false, base: targetAmount }];

    for (const { hasTextbook, base } of variants) {
      if (base < 0) continue;
      if (base % sessionAmount === 0) {
        const count = base / sessionAmount;
        if (count >= 0 && count <= 50) {
          return {
            guessedHoechaCount: count,
            hasTextbook,
            sessionAmount,
            textbookAmount: hasTextbook ? textbookAmount : 0,
            guessedTotal: sessionAmount * count + (hasTextbook ? textbookAmount : 0),
            isExactMatch: true,
          };
        }
      }
    }

    return null;
  }

  // ─── Harin Rate Guess ───────────────────────────────────────────────────

  private guessWithHarinRate(
    totalAmount: number,
    sessionAmount: number,
    textbookAmount: number,
  ): { rate: number; preDiscount: number; guess: AmountGuess } | null {
    // Try common discount rates: 10%, 20%, 30%, ...
    const candidateRates = [10, 20, 30, 40, 50];

    for (const rate of candidateRates) {
      // totalAmount = preDiscount * (1 - rate/100)
      // preDiscount = totalAmount / (1 - rate/100)
      const preDiscount = Math.round(totalAmount / (1 - rate / 100));
      const guess = this.guessAmountBreakdown(preDiscount, sessionAmount, textbookAmount);
      if (guess !== null) {
        // Verify the rounding is close (within 1% of the target rate)
        const actualRate = ((preDiscount - totalAmount) / preDiscount) * 100;
        if (Math.abs(actualRate - rate) < 1) {
          return { rate, preDiscount, guess };
        }
      }
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 3: Attendance vs Amount Cross-check
  // ═══════════════════════════════════════════════════════════════════════════

  private phase3_checkAttendanceVsAmount(ctx: Ctx, sg: Sugangsaeng): void {
    const sgScope: FindingScope = { sugangsaengNanoId: sg.nanoId };

    // Check for empty attendance with non-zero amount
    const hasAnyAttendance = sg.connectedChulseokWorkBranches.length > 0;
    const hasAmount = sg.connectedSueomnyos.some((s) =>
      s.bubunCheonggus.some((b) => !b.isChwiso && (b.nabipAmount > 0 || b.minapAmount > 0)),
    );

    if (hasAmount && !hasAnyAttendance) {
      this.addFinding(ctx, 'warning', 'attendance', 'sugangsaeng.attendance',
        `납입/미납 금액이 있으나 출결 기록이 없음`,
        '수강료는 발생했으나 출결 데이터가 전혀 없습니다. CSV에서 출결이 모두 비어있을 수 있습니다.',
        { scope: sgScope },
      );
    }

    // Check absent-only attendance with nabip
    const onlyAbsent = sg.connectedChulseokWorkBranches.every(
      (cwb) => cwb.hVector.hVectorHwaginCategory === 'absent',
    );
    if (hasAnyAttendance && onlyAbsent && hasAmount) {
      this.addFinding(ctx, 'warning', 'attendance', 'sugangsaeng.attendance',
        `전체 결석인데 수강료가 존재`,
        '모든 출결이 결석인데 납입/미납 금액이 있습니다. 확인이 필요합니다.',
        { scope: sgScope },
      );
    }

    // Check for future boons with attendance
    const totalBoons = sg.connectedBoons.length;
    const attendedBoons = sg.connectedChulseokWorkBranches.length;
    if (attendedBoons > totalBoons) {
      this.addFinding(ctx, 'error', 'attendance', 'sugangsaeng.attendance',
        `출결 수(${attendedBoons})가 회차 수(${totalBoons})보다 많음`,
        '출결 기록이 회차 수를 초과합니다. 데이터 파싱 오류일 수 있습니다.',
        { scope: sgScope },
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 4: Cross-Sugangsaeng Checks
  // ═══════════════════════════════════════════════════════════════════════════

  private phase4_crossSugangsaengChecks(ctx: Ctx): void {
    this.phase4_checkAmountOutliers(ctx);
    this.phase4_checkAmountPattern(ctx);
  }

  private phase4_checkAmountOutliers(ctx: Ctx): void {
    const sgs = ctx.input.sugangsaengs;
    if (sgs.length < 3) return;

    const amounts = sgs.map((sg) => {
      const total = sg.connectedSueomnyos
        .flatMap((s) => s.bubunCheonggus.filter((b) => !b.isChwiso))
        .reduce((sum, b) => sum + b.nabipAmount + b.minapAmount, 0);
      return { sg, total };
    });

    const values = amounts.map((a) => a.total);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return;

    for (const { sg, total } of amounts) {
      const zScore = Math.abs(total - mean) / stddev;
      if (zScore > 1.5) {
        this.addFinding(ctx, 'warning', 'anomaly', 'sugangsaeng.amount',
          `금액(${total.toLocaleString()})이 평균(${Math.round(mean).toLocaleString()})과 크게 다름`,
          '다른 수강생들과 총 금액이 유의미하게 차이가 납니다.',
          {
            scope: { sugangsaengNanoId: sg.nanoId },
            evidence: { total, mean: Math.round(mean), stddev: Math.round(stddev), zScore: Math.round(zScore * 100) / 100 },
          },
        );
      }
    }
  }

  private phase4_checkAmountPattern(ctx: Ctx): void {
    // Find the most common amount — students that differ need attention
    const sgs = ctx.input.sugangsaengs;
    const amountCounts = new Map<number, number>();
    const sgAmounts = new Map<string, number>();

    for (const sg of sgs) {
      const total = sg.connectedSueomnyos
        .flatMap((s) => s.bubunCheonggus.filter((b) => !b.isChwiso))
        .reduce((sum, b) => sum + b.nabipAmount + b.minapAmount, 0);
      sgAmounts.set(sg.nanoId, total);
      amountCounts.set(total, (amountCounts.get(total) ?? 0) + 1);
    }

    if (amountCounts.size <= 1) return;

    let mostCommonAmount = 0;
    let mostCommonCount = 0;
    for (const [amount, count] of amountCounts) {
      if (count > mostCommonCount) {
        mostCommonAmount = amount;
        mostCommonCount = count;
      }
    }

    // Only flag if majority shares the same amount
    if (mostCommonCount < sgs.length * 0.5) return;

    for (const sg of sgs) {
      const total = sgAmounts.get(sg.nanoId) ?? 0;
      if (total !== mostCommonAmount && total > 0) {
        this.addFinding(ctx, 'info', 'anomaly', 'sugangsaeng.amount',
          `금액(${total.toLocaleString()}) ≠ 다수 금액(${mostCommonAmount.toLocaleString()})`,
          `대부분의 수강생(${mostCommonCount}명)은 ${mostCommonAmount.toLocaleString()}원인데 이 수강생은 ${total.toLocaleString()}원입니다. 할인, 추가청구, 또는 회차 차이일 수 있습니다.`,
          {
            scope: { sugangsaengNanoId: sg.nanoId },
            evidence: { studentAmount: total, commonAmount: mostCommonAmount, commonCount: mostCommonCount },
          },
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Report Builder (same output format as Teachita validator)
  // ═══════════════════════════════════════════════════════════════════════════

  private buildReport(ctx: Ctx): SueopAggregateReport {
    const allFindings = ctx.findings;
    const globalFindings = allFindings.filter((f) => !f.scope?.sugangsaengNanoId);

    const analysisRows: SugangsaengAnalysisRow[] = ctx.input.sugangsaengs.map((sg) =>
      this.buildAnalysisRow(ctx, sg),
    );

    const sueopSummary = this.buildSueopSummary(ctx, analysisRows);

    const errorCount = allFindings.filter((f) => f.severity === 'error').length;
    const warningCount = allFindings.filter((f) => f.severity === 'warning').length;
    const infoCount = allFindings.filter((f) => f.severity === 'info').length;

    const findingsByCategory: Record<string, ValidationFinding[]> = {};
    for (const finding of allFindings) {
      if (!findingsByCategory[finding.category]) {
        findingsByCategory[finding.category] = [];
      }
      findingsByCategory[finding.category].push(finding);
    }

    return {
      isValid: errorCount === 0,
      summary: { errorCount, warningCount, infoCount },
      findings: allFindings,
      findingsByCategory,
      analysisRows,
      sueopSummary,
      globalFindings,
    };
  }

  private buildAnalysisRow(ctx: Ctx, sg: Sugangsaeng): SugangsaengAnalysisRow {
    const sgFindings = ctx.findings.filter((f) => f.scope?.sugangsaengNanoId === sg.nanoId);
    const chulseokByBoon = new Map<string, typeof sg.connectedChulseokWorkBranches[number]>();
    for (const cwb of sg.connectedChulseokWorkBranches) {
      chulseokByBoon.set(cwb.boonNanoId, cwb);
    }

    // Attendance cells
    const attendanceCells: AttendanceCell[] = sg.connectedBoons
      .map((boon): AttendanceCell => {
        const cwb = chulseokByBoon.get(boon.boonNanoId);
        const boonFindings = sgFindings.filter((f) => f.scope?.boonNanoId === boon.boonNanoId);
        const worstSeverity = this.getWorstSeverity(boonFindings);

        return {
          boonNanoId: boon.boonNanoId,
          boonName: boon.boonName,
          date: boon.boonIljeong?.startAt ?? null,
          hwaginCategory: cwb?.hVector.hVectorHwaginCategory ?? null,
          yejeongCategory: null, // compat: no yejeong data
          hasSueomnyo: false, // compat: no per-boon sueomnyo mapping
          sueomnyoNanoId: null,
          bigo: null, // compat: no bigo
          highlight: worstSeverity
            ? { severity: worstSeverity, message: boonFindings[0]?.message ?? '' }
            : null,
        };
      })
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });

    // Counts
    const billableAttendanceCount = attendanceCells.filter(
      (c) => c.hwaginCategory !== null && BILLABLE_CATEGORIES.includes(c.hwaginCategory),
    ).length;
    const totalAttendanceCount = attendanceCells.filter((c) => c.hwaginCategory !== null).length;

    // Amounts (compat: all in-scope, no related — no timestamp data to distinguish)
    const activeBubuns = sg.connectedSueomnyos.flatMap((s) =>
      s.bubunCheonggus.filter((b) => !b.isChwiso),
    );
    const nabipAmount = activeBubuns.reduce((sum, b) => sum + b.nabipAmount, 0);
    const minapAmount = activeBubuns.reduce((sum, b) => sum + b.minapAmount, 0);

    const inScope = {
      nabipAmount,
      minapAmount,
      harinAmount: 0,
      sueomnyoCount: sg.connectedSueomnyos.length,
    };
    const related = {
      nabipAmount: 0,
      minapAmount: 0,
      harinAmount: 0,
      sueomnyoCount: 0,
    };

    // Gyesan (expected) = session-only, no textbook
    const sessionAmount = ctx.input.sueop.amount ?? 0;
    const chugaKon = ctx.input.sueop.kons.find((k) => k.konCategory === 'chuga-cheonggu');
    const textbookAmount = chugaKon?.gibonBoonAmount ?? 0;
    const sgHarinAmount = activeBubuns.reduce((s, b) => s + b.harinAmount, 0);
    const rawGyesanAmount = billableAttendanceCount * sessionAmount + textbookAmount;
    const actualTotal = nabipAmount + minapAmount;
    const sgHarinRate = sgHarinAmount > 0 && actualTotal > 0
      ? Math.round((sgHarinAmount / (actualTotal + sgHarinAmount)) * 100)
      : 0;
    const gyesanAmount = sgHarinRate > 0
      ? Math.round(rawGyesanAmount * (1 - sgHarinRate / 100))
      : rawGyesanAmount;
    const chayi = actualTotal - gyesanAmount;
    const amountBreakdown = this.buildAmountBreakdown(sessionAmount, textbookAmount, billableAttendanceCount, actualTotal, sgHarinAmount);
    const enrollmentContext: EnrollmentContext = {
      ipbanAt: null, toebanAt: null,
      enteredDuringPeriod: false, leftDuringPeriod: false,
      hasPriorMonthActivity: false,
    };

    // Timing details (compat: minimal)
    const sueomnyoTimingDetails: SueomnyoTimingDetail[] = sg.connectedSueomnyos.map((sm) => ({
      cheongguNanoId: sm.cheongguNanoId,
      cheongguName: sm.cheongguName,
      boonNanoId: null,
      konCategory: null,
      scopeCategory: 'in-scope' as const, // compat: assume all in-scope
      cheongguCreatedAt: null,
      cheongguAt: null,
      nabipTimestamp: null,
      totalActualAmount: sm.cheongguTotalActualAmount,
      totalNabipAmount: activeBubuns.reduce((s, b) => s + b.nabipAmount, 0),
      totalMinapAmount: activeBubuns.reduce((s, b) => s + b.minapAmount, 0),
      totalHarinAmount: 0,
      hasConcern: minapAmount > 0,
    }));

    // Status
    const hasError = sgFindings.some((f) => f.severity === 'error');
    const hasWarning = sgFindings.some((f) => f.severity === 'warning');
    const connectionStatus: SugangsaengAnalysisRow['connectionStatus'] = hasError
      ? 'error'
      : hasWarning
        ? 'warning'
        : 'normal';

    // Highlights
    const nabipHighlight: CellHighlight | null = chayi !== 0
      ? { severity: 'warning', message: `차이: ${chayi > 0 ? '+' : ''}${chayi.toLocaleString()}` }
      : null;
    const chayiHighlight: CellHighlight | null = chayi !== 0
      ? { severity: 'error', message: '납입액과 계산액 차이' }
      : null;
    const statusHighlight: CellHighlight | null = connectionStatus !== 'normal'
      ? { severity: connectionStatus, message: sgFindings.find((f) => f.severity === connectionStatus)?.message ?? '' }
      : null;

    return {
      sugangsaengNanoId: sg.nanoId,
      sugangsaengName: sg.name,
      isHwalseong: true,
      boonbanGroupName: null,
      attendanceCells,
      harinRate: sgHarinRate,
      harinAmount: sgHarinAmount,
      harinHighlight: sgHarinAmount > 0
        ? { severity: 'info' as FindingSeverity, message: `할인 ${Math.round((sgHarinAmount / (actualTotal + sgHarinAmount)) * 100)}% 적용됨` }
        : null,
      connectionStatus,
      statusHighlight,
      billableAttendanceCount,
      totalAttendanceCount,
      amountBreakdown,
      enrollmentContext,
      inScope,
      related,
      nabipAmount,
      nabipHighlight,
      minapAmount,
      gyesanAmount,
      chayi,
      chayiHighlight,
      hasRelatedAmounts: false,
      sueomnyoTimingDetails,
      findings: sgFindings,
    };
  }

  private buildSueopSummary(ctx: Ctx, rows: SugangsaengAnalysisRow[]): SueopSummary {
    return {
      sueopNanoId: ctx.input.sueop.nanoId,
      sueopName: ctx.input.sueop.name,
      queryPeriod: ctx.input.queryPeriod,
      totalSugangsaengCount: rows.length,
      activeSugangsaengCount: rows.length,
      totalBillableAttendanceCount: rows.reduce((s, r) => s + r.billableAttendanceCount, 0),
      expectedTotalAmount: rows.reduce((s, r) => s + r.gyesanAmount, 0),
      inScope: {
        nabipTotal: rows.reduce((s, r) => s + r.nabipAmount, 0),
        minapTotal: rows.reduce((s, r) => s + r.minapAmount, 0),
        harinTotal: 0,
      },
      related: {
        nabipTotal: 0,
        minapTotal: 0,
        harinTotal: 0,
        sugangsaengCount: 0,
      },
      totalChayi: rows.reduce((s, r) => s + r.chayi, 0),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private buildAmountBreakdown(
    sessionAmount: number,
    textbookAmount: number,
    billableCount: number,
    actualTotal: number,
    harinAmount: number = 0,
  ): AmountBreakdown {
    const lines: AmountBreakdownLine[] = [];

    // For guessing, use pre-discount amount if harin exists
    const preDiscountTotal = actualTotal + harinAmount;
    const guessTarget = harinAmount > 0 ? preDiscountTotal : actualTotal;
    const guess = this.guessAmountBreakdown(guessTarget, sessionAmount, textbookAmount);

    if (guess !== null) {
      lines.push({
        label: '회차 수강료',
        konCategory: 'hoecha',
        unitAmount: sessionAmount,
        count: guess.guessedHoechaCount,
        subtotal: sessionAmount * guess.guessedHoechaCount,
        isGuessed: guess.guessedHoechaCount !== billableCount,
      });
      if (guess.hasTextbook) {
        lines.push({
          label: '교재비',
          konCategory: 'chuga-cheonggu',
          unitAmount: textbookAmount,
          count: 1,
          subtotal: textbookAmount,
          isGuessed: false,
        });
      }
    }
    // When guess fails, don't fall back to expected — leave lines empty.
    // The explanation will show "구성 추정 불가" and Phase 2 already generates a finding.

    if (harinAmount > 0) {
      lines.push({
        label: '할인',
        konCategory: null,
        unitAmount: -harinAmount,
        count: 1,
        subtotal: -harinAmount,
        isGuessed: false,
      });
    }

    const calculatedTotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const delta = actualTotal - calculatedTotal;

    const parts = lines.map((l) => {
      if (l.subtotal < 0) return `할인 ${Math.abs(l.subtotal).toLocaleString()}`;
      return l.count > 1 ? `${l.unitAmount.toLocaleString()} × ${l.count}회` : `${l.label} ${l.subtotal.toLocaleString()}`;
    });
    const explanation = parts.length > 0
      ? `${parts.join(' + ')} = ${calculatedTotal.toLocaleString()}${delta !== 0 ? ` (차이 ${delta > 0 ? '+' : ''}${delta.toLocaleString()})` : ''}`
      : actualTotal > 0 ? `${actualTotal.toLocaleString()} — 구성 추정 불가` : '금액 없음';

    return {
      lines,
      calculatedTotal,
      actualTotal,
      delta,
      isFullyExplained: delta === 0,
      explanation,
    };
  }

  private getWorstSeverity(findings: ValidationFinding[]): FindingSeverity | null {
    if (findings.some((f) => f.severity === 'error')) return 'error';
    if (findings.some((f) => f.severity === 'warning')) return 'warning';
    if (findings.some((f) => f.severity === 'info')) return 'info';
    return null;
  }

  private addFinding(
    ctx: Ctx,
    severity: FindingSeverity,
    category: string,
    field: string,
    message: string,
    reason: string,
    options?: { scope?: FindingScope; evidence?: Record<string, unknown>; suggestion?: string },
  ): void {
    ctx.findings.push({
      severity,
      category,
      field,
      message,
      reason,
      scope: options?.scope,
      evidence: options?.evidence,
      suggestion: options?.suggestion,
    });
  }
}
