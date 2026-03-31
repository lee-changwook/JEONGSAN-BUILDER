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
  type ConnectedSueomnyo,
  type BubunCheonggu,
  type QueryPeriod,
  type SueomnyoScopeCategory,
  type SugangsaengAnalysisRow,
  type AttendanceCell,
  type SueomnyoTimingDetail,
  type SueopSummary,
  type AmountBreakdown,
  type AmountBreakdownLine,
  type EnrollmentContext,
} from './sueop-aggregate.validator-strategy.type';

type Ctx = ValidationContext<SueopAggregateInput, SueopAggregateDerived>;

export class SueopAggregateValidatorStrategyImpl
  implements ValidatorStrategy<SueopAggregateInput, SueopAggregateReport>
{
  // ─── Singleton ───────────────────────────────────────────────────────────

  private static instance: SueopAggregateValidatorStrategyImpl;

  private constructor() {}

  public static getInstance(): SueopAggregateValidatorStrategyImpl {
    if (!SueopAggregateValidatorStrategyImpl.instance) {
      SueopAggregateValidatorStrategyImpl.instance = new SueopAggregateValidatorStrategyImpl();
    }
    return SueopAggregateValidatorStrategyImpl.instance;
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

    // Phase 1: Check the obvious — mapping validity (global scope)
    this.phase1_checkMappingValidity(ctx);

    // Per-sugangsaeng validation phases
    for (const sg of input.sugangsaengs) {
      // Phase 2: Connection state validity within sueop
      this.phase2_checkConnectionStates(ctx, sg);
      // Phase 3: Sueomnyo existence vs connections
      this.phase3_checkSueomnyoExistence(ctx, sg);
      // Phase 4: Chulseok × Sueomnyo cross-validation for hoecha boons
      this.phase4_validateChulseokVsSueomnyo(ctx, sg);
    }

    // Phase 5: Cross-sugangsaeng checks & anomaly detection
    this.phase5_crossSugangsaengChecks(ctx);

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
  // Phase 1: Check the obvious — Mapping Validity
  // README #3: All available kon and boon should exist in sueop.
  // ═══════════════════════════════════════════════════════════════════════════

  private phase1_checkMappingValidity(ctx: Ctx): void {
    const { sueopBoonMap, sueopKonMap } = ctx.derived;

    for (const sg of ctx.input.sugangsaengs) {
      const sgScope: FindingScope = { sugangsaengNanoId: sg.nanoId };

      // Boon → Sueop.boons mapping
      for (const boon of sg.connectedBoons) {
        if (!sueopBoonMap.has(boon.boonNanoId)) {
          this.addFinding(ctx, 'error', 'mapping', `sugangsaeng.connectedBoons`,
            `분 "${boon.boonName}"이(가) 수업의 분 목록에 존재하지 않음`,
            '수강생이 연결된 분이 수업에 포함되어 있지 않습니다. 데이터 정합성 오류입니다.',
            { scope: sgScope, evidence: { boonNanoId: boon.boonNanoId, boonName: boon.boonName } },
          );
        }
      }

      // Kon → Sueop.kons mapping
      for (const kon of sg.connectedKons) {
        if (!sueopKonMap.has(kon.nanoId)) {
          this.addFinding(ctx, 'error', 'mapping', `sugangsaeng.connectedKons`,
            `콘 "${kon.konName}"이(가) 수업의 콘 목록에 존재하지 않음`,
            '수강생이 연결된 콘이 수업에 포함되어 있지 않습니다. 데이터 정합성 오류입니다.',
            { scope: sgScope, evidence: { konNanoId: kon.nanoId, konName: kon.konName } },
          );
        }
      }

      // ChulseokWorkBranch → Boon mapping
      const sgBoonIds = new Set(sg.connectedBoons.map((b) => b.boonNanoId));
      for (const cwb of sg.connectedChulseokWorkBranches) {
        if (!sgBoonIds.has(cwb.boonNanoId)) {
          this.addFinding(ctx, 'error', 'mapping', `sugangsaeng.connectedChulseokWorkBranches`,
            `출결 워크 "${cwb.workBranchName}"이(가) 연결된 분을 찾을 수 없음`,
            '출결 기록이 수강생의 분 연결 목록에 없는 분을 참조합니다.',
            { scope: { ...sgScope, boonNanoId: cwb.boonNanoId }, evidence: { workBranchNanoId: cwb.workBranchNanoId } },
          );
        }
      }

      // Sueomnyo → Boon mapping (if boonNanoId is not null)
      for (const sm of sg.connectedSueomnyos) {
        if (sm.boonNanoId !== null && !sgBoonIds.has(sm.boonNanoId)) {
          this.addFinding(ctx, 'error', 'mapping', `sugangsaeng.connectedSueomnyos`,
            `수업료 "${sm.cheongguName}"이(가) 연결된 분을 찾을 수 없음`,
            '수업료가 수강생의 분 연결 목록에 없는 분을 참조합니다.',
            { scope: { ...sgScope, boonNanoId: sm.boonNanoId, cheongguNanoId: sm.cheongguNanoId } },
          );
        }
      }

      // Null iljeong / timestamp warnings
      for (const boon of sg.connectedBoons) {
        const konCategory = this.getKonCategoryForBoon(ctx, boon.konNanoId);
        if (konCategory === 'hoecha' && boon.boonIljeong === null) {
          this.addFinding(ctx, 'warning', 'mapping', `sugangsaeng.connectedBoons.boonIljeong`,
            `회차콘 분 "${boon.boonName}"에 일정이 없음`,
            '회차콘과 연결된 분인데 일정이 없습니다. 출결/시간대 검증이 불가합니다.',
            { scope: { ...sgScope, boonNanoId: boon.boonNanoId } },
          );
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 2: Connection State Validity
  // README #4: Check if sugangsaengs have valid connection states inside a sueop
  // ═══════════════════════════════════════════════════════════════════════════

  private phase2_checkConnectionStates(ctx: Ctx, sg: Sugangsaeng): void {
    const sgScope: FindingScope = { sugangsaengNanoId: sg.nanoId };
    const sgKonIds = new Set(sg.connectedKons.map((k) => k.nanoId));
    const sgBoonIds = new Set(sg.connectedBoons.map((b) => b.boonNanoId));
    const chulseokBoonIds = new Set(sg.connectedChulseokWorkBranches.map((c) => c.boonNanoId));

    // TODO: Boon → Kon bidirectional check
    //  - If connected to a boon, should also be connected to the kon that boon belongs to
    for (const boon of sg.connectedBoons) {
      if (!sgKonIds.has(boon.konNanoId)) {
        this.addFinding(ctx, 'error', 'connection', `sugangsaeng.connectedBoons`,
          `분 "${boon.boonName}"의 콘에 수강생이 연결되어 있지 않음`,
          '분에 연결되어 있으나 해당 분의 콘에는 연결되어 있지 않습니다.',
          { scope: { ...sgScope, boonNanoId: boon.boonNanoId } },
        );
      }
    }

    // TODO: Kon → Boon check (hoecha kons must have a boon connection)
    for (const kon of sg.connectedKons) {
      if (kon.category === 'hoecha') {
        const hasBoonForKon = sg.connectedBoons.some((b) => b.konNanoId === kon.nanoId);
        if (!hasBoonForKon) {
          this.addFinding(ctx, 'warning', 'connection', `sugangsaeng.connectedKons`,
            `회차콘 "${kon.konName}"에 연결된 분이 없음`,
            '회차콘에 수강생이 연결되어 있으나 해당 콘의 분에는 연결되어 있지 않습니다.',
            { scope: sgScope },
          );
        }
      }
    }

    // TODO: Hoecha boon → ChulseokWork check
    for (const boon of sg.connectedBoons) {
      const konCategory = this.getKonCategoryForBoon(ctx, boon.konNanoId);
      if (konCategory === 'hoecha' && !chulseokBoonIds.has(boon.boonNanoId)) {
        this.addFinding(ctx, 'warning', 'connection', `sugangsaeng.connectedBoons`,
          `회차콘 분 "${boon.boonName}"에 출결 워크가 연결되지 않음`,
          '회차콘 분에 연결되어 있으나 해당 분의 출결 워크에는 연결되어 있지 않습니다.',
          { scope: { ...sgScope, boonNanoId: boon.boonNanoId } },
        );
      }
    }

    // TODO: ChulseokWork → Boon reverse check
    for (const cwb of sg.connectedChulseokWorkBranches) {
      if (!sgBoonIds.has(cwb.boonNanoId)) {
        this.addFinding(ctx, 'error', 'connection', `sugangsaeng.connectedChulseokWorkBranches`,
          `출결 워크 "${cwb.workBranchName}"의 분에 수강생이 연결되어 있지 않음`,
          '출결 워크에 연결되어 있으나 해당 워크의 분에는 연결되어 있지 않습니다.',
          { scope: { ...sgScope, boonNanoId: cwb.boonNanoId } },
        );
      }
    }

    // TODO: Multiple boons of same kon warning
    const boonsByKon = new Map<string, string[]>();
    for (const boon of sg.connectedBoons) {
      const existing = boonsByKon.get(boon.konNanoId) ?? [];
      existing.push(boon.boonNanoId);
      boonsByKon.set(boon.konNanoId, existing);
    }
    for (const [konNanoId, boonNanoIds] of boonsByKon) {
      if (boonNanoIds.length > 1) {
        const konName = sg.connectedKons.find((k) => k.nanoId === konNanoId)?.konName ?? konNanoId;
        this.addFinding(ctx, 'warning', 'connection', `sugangsaeng.connectedBoons`,
          `콘 "${konName}"에 ${boonNanoIds.length}개의 분이 연결됨`,
          '같은 콘에 복수의 분이 연결되어 있습니다. 전반 또는 other-boonban 케이스인지 확인이 필요합니다.',
          { scope: sgScope, evidence: { konNanoId, boonCount: boonNanoIds.length } },
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 3: Sueomnyo Existence vs Connections
  // README #5: Compare sugangsaeng connection status and their sueomnyo
  // ═══════════════════════════════════════════════════════════════════════════

  private phase3_checkSueomnyoExistence(ctx: Ctx, sg: Sugangsaeng): void {
    const sgScope: FindingScope = { sugangsaengNanoId: sg.nanoId };
    const sueomnyoBoonIds = new Set(
      sg.connectedSueomnyos.filter((s) => s.boonNanoId !== null).map((s) => s.boonNanoId),
    );

    // TODO: Hoecha boon → sueomnyo existence
    for (const boon of sg.connectedBoons) {
      const konCategory = this.getKonCategoryForBoon(ctx, boon.konNanoId);
      if (konCategory !== 'hoecha') continue;
      if (!boon.isHwalseongBoonSugangsaeng) continue;

      if (!sueomnyoBoonIds.has(boon.boonNanoId)) {
        const isPastBoon = boon.boonIljeong !== null && new Date(boon.boonIljeong.startAt) < new Date();
        this.addFinding(ctx, isPastBoon ? 'error' : 'warning', 'sueomnyo-existence',
          `sugangsaeng.connectedSueomnyos`,
          `분 "${boon.boonName}"에 대한 수업료가 없음`,
          isPastBoon
            ? '일정이 이미 지난 분인데 수업료가 생성되지 않았습니다.'
            : '분에 연결되어 있으나 수업료가 아직 생성되지 않았습니다.',
          { scope: { ...sgScope, boonNanoId: boon.boonNanoId }, evidence: { isPastBoon } },
        );
      }
    }

    // TODO: Chuga-cheonggu kon → sueomnyo for gibon boon
    for (const kon of sg.connectedKons) {
      if (kon.category !== 'chuga-cheonggu') continue;
      if (!kon.isHwalseongKonSugangsaeng) continue;

      const hasGibonBoonSueomnyo = sg.connectedSueomnyos.some(
        (s) => s.boonNanoId === kon.gibonBoonNanoId,
      );
      if (!hasGibonBoonSueomnyo) {
        this.addFinding(ctx, 'warning', 'sueomnyo-existence',
          `sugangsaeng.connectedSueomnyos`,
          `추가청구콘 "${kon.konName}"에 대한 수업료가 없음`,
          '추가청구콘에 연결되어 있으나 기본 분에 대한 수업료가 생성되지 않았습니다.',
          { scope: sgScope, evidence: { konNanoId: kon.nanoId, gibonBoonNanoId: kon.gibonBoonNanoId } },
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 4: Chulseok × Sueomnyo Cross-Validation
  // README #6: Validate if sueomnyos and chulseok status for hoecha kon boons
  // ═══════════════════════════════════════════════════════════════════════════

  private phase4_validateChulseokVsSueomnyo(ctx: Ctx, sg: Sugangsaeng): void {
    const sgScope: FindingScope = { sugangsaengNanoId: sg.nanoId };
    const sueomnyoByBoon = new Map(
      sg.connectedSueomnyos.filter((s) => s.boonNanoId !== null).map((s) => [s.boonNanoId!, s]),
    );

    for (const cwb of sg.connectedChulseokWorkBranches) {
      const boonScope: FindingScope = { ...sgScope, boonNanoId: cwb.boonNanoId };
      const category = cwb.hVector.hVectorHwaginCategory;
      const sueomnyo = sueomnyoByBoon.get(cwb.boonNanoId);

      // TODO: chulseok-site, chulseok-online, jigak, bogang → sueomnyo must exist
      if (
        (category === 'chulseok-site' || category === 'chulseok-online' || category === 'jigak' || category === 'bogang') &&
        !sueomnyo
      ) {
        this.addFinding(ctx, 'error', 'chulseok-sueomnyo', `sugangsaeng.connectedChulseokWorkBranches`,
          `출결 "${category}"인데 수업료가 없음 (${cwb.workBranchName})`,
          '출석/지각 처리가 되었으나 해당 분에 수업료가 생성되지 않았습니다.',
          { scope: boonScope },
        );
      }

      // TODO: chulseok-online → check allims for video link
      if (category === 'chulseok-online' && sueomnyo) {
        this.addFinding(ctx, 'info', 'chulseok-sueomnyo', `sugangsaeng.allims`,
          `온라인 출석 — 영상 발송 여부 확인 필요 (${cwb.workBranchName})`,
          '온라인 출석 처리가 되었습니다. 실제 영상 발송 여부를 allim 기록에서 확인하세요.',
          { scope: boonScope },
        );
      }

      // TODO: mihwagin, absent with sueomnyo that has nabip/minap → concern
      if ((category === 'mihwagin' || category === 'absent') && sueomnyo) {
        const activeBubuns = sueomnyo.bubunCheonggus.filter((b) => !b.isChwiso);
        const hasNabip = activeBubuns.some((b) => b.nabipAmount > 0);
        const hasMinap = activeBubuns.some((b) => b.minapAmount > 0);
        if (hasNabip || hasMinap) {
          this.addFinding(ctx, 'warning', 'chulseok-sueomnyo',
            `sugangsaeng.connectedChulseokWorkBranches`,
            `출결 "${category}"인데 수업료에 납입/미납이 존재 (${cwb.workBranchName})`,
            category === 'mihwagin'
              ? '출결이 미확인 상태인데 수업료 납입/미납이 기록되어 있습니다. 출결 확인이 필요합니다.'
              : '결석인데 수업료 납입/미납이 존재합니다. 정상적인 청구인지 확인이 필요합니다.',
            { scope: boonScope, evidence: { hasNabip, hasMinap, category } },
          );
        }
      }

      // TODO: other-boonban — sueomnyo may not exist but caution
      if (category === 'other-boonban' && !sueomnyo) {
        this.addFinding(ctx, 'info', 'chulseok-sueomnyo', `sugangsaeng.connectedChulseokWorkBranches`,
          `다른분반 출석이나 수업료 없음 (${cwb.workBranchName})`,
          '다른 분반 출석 처리가 되었으나 수업료가 없습니다. 같은 콘 내 다른 분에서 청구될 수 있습니다.',
          { scope: boonScope },
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 5: Cross-Sugangsaeng Checks & Anomalies
  // README #7: Other checkpoints and reporting factors
  // ═══════════════════════════════════════════════════════════════════════════

  private phase5_crossSugangsaengChecks(ctx: Ctx): void {
    this.phase5_checkAmountOutliers(ctx);
    this.phase5_checkBoonbanGroupMismatch(ctx);
    this.phase5_checkBigoHarinConsistency(ctx);
    this.phase5_checkChwisoHwalseongConsistency(ctx);
  }

  // ─── 5-1: Amount Outlier Detection ─────────────────────────────────────

  private phase5_checkAmountOutliers(ctx: Ctx): void {
    const activeSgs = ctx.input.sugangsaengs.filter((sg) => sg.isHwalseong);
    if (activeSgs.length < 3) return;

    const nabipBySg = activeSgs.map((sg) => {
      const total = sg.connectedSueomnyos
        .flatMap((s) => s.bubunCheonggus.filter((b) => !b.isChwiso))
        .reduce((sum, b) => sum + b.nabipAmount, 0);
      return { sg, total };
    });

    const amounts = nabipBySg.map((x) => x.total);
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const variance = amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return;

    for (const { sg, total } of nabipBySg) {
      const zScore = Math.abs(total - mean) / stddev;
      if (zScore > 1.5) {
        this.addFinding(ctx, 'warning', 'anomaly', 'sugangsaeng.nabipAmount',
          `납입액(${total.toLocaleString()})이 평균(${Math.round(mean).toLocaleString()})과 크게 다름`,
          '다른 수강생들과 납입액이 유의미하게 차이가 납니다. 할인, 추가청구, 또는 오입력 여부를 확인하세요.',
          {
            scope: { sugangsaengNanoId: sg.nanoId },
            evidence: { nabipAmount: total, mean: Math.round(mean), stddev: Math.round(stddev), zScore: Math.round(zScore * 100) / 100 },
          },
        );
      }
    }
  }

  // ─── 5-2: Boonban Group Mismatch ───────────────────────────────────────

  private phase5_checkBoonbanGroupMismatch(ctx: Ctx): void {
    for (const sg of ctx.input.sugangsaengs) {
      if (!sg.boonbanSugangsaengGroupNanoId) continue;

      for (const boon of sg.connectedBoons) {
        if (!boon.boonbanSugangsaengGroupNanoId) continue;
        if (boon.boonbanSugangsaengGroupNanoId === sg.boonbanSugangsaengGroupNanoId) continue;

        const chulseok = sg.connectedChulseokWorkBranches.find((c) => c.boonNanoId === boon.boonNanoId);
        const hwaginCategory = chulseok?.hVector.hVectorHwaginCategory;
        if (hwaginCategory === 'other-boonban') continue;

        this.addFinding(ctx, 'warning', 'anomaly', 'sugangsaeng.boonbanGroup',
          `다른 분반 그룹의 분 "${boon.boonName}"에 출석`,
          `수강생은 "${sg.boonbanSugangsaengGroupName}" 소속이나 "${boon.boonbanSugangsaengGroupName}" 분반의 분에 출석 기록이 있습니다.`,
          {
            scope: { sugangsaengNanoId: sg.nanoId, boonNanoId: boon.boonNanoId },
            evidence: {
              sgGroupNanoId: sg.boonbanSugangsaengGroupNanoId,
              boonGroupNanoId: boon.boonbanSugangsaengGroupNanoId,
            },
          },
        );
      }
    }
  }

  // ─── 5-3: Bigo ↔ Harin Consistency ────────────────────────────────────

  private phase5_checkBigoHarinConsistency(ctx: Ctx): void {
    for (const sg of ctx.input.sugangsaengs) {
      for (const sm of sg.connectedSueomnyos) {
        const activeBubuns = sm.bubunCheonggus.filter((b) => !b.isChwiso);
        const totalHarin = activeBubuns.reduce((s, b) => s + b.harinAmount, 0);

        const bigoTexts = [
          sm.cheongguBigo,
          ...activeBubuns.map((b) => b.bubunCheongguBigo),
        ].filter(Boolean) as string[];

        const mentionsHarin = bigoTexts.some((t) => t.includes('할인'));

        if (mentionsHarin && totalHarin === 0) {
          this.addFinding(ctx, 'warning', 'anomaly', 'sugangsaeng.connectedSueomnyos.bigo',
            `수업료 "${sm.cheongguName}" 비고에 할인 언급이 있으나 할인 금액이 0`,
            '비고에 할인 관련 내용이 작성되어 있으나 실제 할인 금액이 적용되지 않았습니다.',
            {
              scope: { sugangsaengNanoId: sg.nanoId, cheongguNanoId: sm.cheongguNanoId },
              evidence: { bigoTexts, totalHarin },
            },
          );
        }
      }
    }
  }

  // ─── 5-4: Chwiso / isHwalseong Consistency ────────────────────────────

  private phase5_checkChwisoHwalseongConsistency(ctx: Ctx): void {
    for (const sg of ctx.input.sugangsaengs) {
      // Chwiso bubunCheonggu should have nabip=0, minap=0
      for (const sm of sg.connectedSueomnyos) {
        for (const bc of sm.bubunCheonggus) {
          if (bc.isChwiso && (bc.nabipAmount !== 0 || bc.minapAmount !== 0)) {
            this.addFinding(ctx, 'error', 'consistency', 'sugangsaeng.connectedSueomnyos.bubunCheonggus',
              `취소된 부분청구 "${bc.name}"에 납입/미납 금액이 존재`,
              '취소 상태의 부분청구에 금액이 남아 있습니다. 취소 처리가 올바르게 되지 않았을 수 있습니다.',
              {
                scope: { sugangsaengNanoId: sg.nanoId, cheongguNanoId: sm.cheongguNanoId },
                evidence: { bubunCheongguNanoId: bc.nanoId, nabipAmount: bc.nabipAmount, minapAmount: bc.minapAmount },
              },
            );
          }
        }
      }

      // !isHwalseong sugangsaeng with active connections → warning
      if (!sg.isHwalseong) {
        const hasActiveConnections =
          sg.connectedBoons.some((b) => b.isHwalseongBoonSugangsaeng) ||
          sg.connectedKons.some((k) => k.isHwalseongKonSugangsaeng);

        if (hasActiveConnections) {
          this.addFinding(ctx, 'warning', 'consistency', 'sugangsaeng.isHwalseong',
            `비활성 수강생에 활성 상태의 분/콘 연결이 존재`,
            '수강생이 비활성 상태이나 분 또는 콘에 활성 연결이 남아 있습니다. 연결 해제가 필요할 수 있습니다.',
            { scope: { sugangsaengNanoId: sg.nanoId } },
          );
        }

        const hasNonZeroAmount = sg.connectedSueomnyos.some((sm) =>
          sm.bubunCheonggus.some((b) => !b.isChwiso && (b.nabipAmount > 0 || b.minapAmount > 0)),
        );

        if (hasNonZeroAmount) {
          this.addFinding(ctx, 'warning', 'consistency', 'sugangsaeng.isHwalseong',
            `비활성 수강생에 납입/미납 금액이 존재`,
            '수강생이 비활성 상태이나 납입 또는 미납 금액이 남아 있습니다.',
            { scope: { sugangsaengNanoId: sg.nanoId } },
          );
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Report Builder
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

  // ─── Analysis Row Builder ────────────────────────────────────────────────

  private buildAnalysisRow(ctx: Ctx, sg: Sugangsaeng): SugangsaengAnalysisRow {
    const sgFindings = ctx.findings.filter((f) => f.scope?.sugangsaengNanoId === sg.nanoId);
    const chulseokByBoon = new Map<string, typeof sg.connectedChulseokWorkBranches[number]>();
    for (const cwb of sg.connectedChulseokWorkBranches) {
      chulseokByBoon.set(cwb.boonNanoId, cwb);
    }
    const sueomnyoByBoon = new Map(
      sg.connectedSueomnyos.filter((s) => s.boonNanoId !== null).map((s) => [s.boonNanoId!, s]),
    );

    // --- Attendance cells (ordered by date) ---
    const attendanceCells: AttendanceCell[] = sg.connectedBoons
      .map((boon): AttendanceCell => {
        const cwb = chulseokByBoon.get(boon.boonNanoId);
        const sueomnyo = sueomnyoByBoon.get(boon.boonNanoId);
        const boonFindings = sgFindings.filter((f) => f.scope?.boonNanoId === boon.boonNanoId);
        const worstSeverity = this.getWorstSeverity(boonFindings);

        return {
          boonNanoId: boon.boonNanoId,
          boonName: boon.boonName,
          date: boon.boonIljeong?.startAt ?? null,
          hwaginCategory: cwb?.hVector.hVectorHwaginCategory ?? null,
          yejeongCategory: cwb?.hVector.hVectorYejeongCategory ?? null,
          hasSueomnyo: sueomnyo !== undefined,
          sueomnyoNanoId: sueomnyo?.cheongguNanoId ?? null,
          bigo: cwb?.hVector.hVectorBigo ?? null,
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

    // --- Attendance counts ---
    const billableAttendanceCount = attendanceCells.filter(
      (c) => c.hwaginCategory !== null && BILLABLE_CATEGORIES.includes(c.hwaginCategory),
    ).length;
    const totalAttendanceCount = attendanceCells.filter((c) => c.hwaginCategory !== null).length;

    // --- Sueomnyo timing details (with scope classification) ---
    const sueomnyoTimingDetails = this.buildTimingDetails(ctx, sg);

    // --- Amount computation by scope ---
    const inScopeDetails = sueomnyoTimingDetails.filter((d) => d.scopeCategory === 'in-scope');
    const relatedDetails = sueomnyoTimingDetails.filter((d) => d.scopeCategory === 'related');

    const inScope = {
      nabipAmount: inScopeDetails.reduce((s, d) => s + d.totalNabipAmount, 0),
      minapAmount: inScopeDetails.reduce((s, d) => s + d.totalMinapAmount, 0),
      harinAmount: inScopeDetails.reduce((s, d) => s + d.totalHarinAmount, 0),
      sueomnyoCount: inScopeDetails.length,
    };
    const related = {
      nabipAmount: relatedDetails.reduce((s, d) => s + d.totalNabipAmount, 0),
      minapAmount: relatedDetails.reduce((s, d) => s + d.totalMinapAmount, 0),
      harinAmount: relatedDetails.reduce((s, d) => s + d.totalHarinAmount, 0),
      sueomnyoCount: relatedDetails.length,
    };

    const nabipAmount = inScope.nabipAmount;
    const minapAmount = inScope.minapAmount;
    const harinAmount = inScope.harinAmount;
    const totalInScopeActual = inScopeDetails.reduce((s, d) => s + d.totalActualAmount, 0);
    const harinRate = totalInScopeActual > 0 ? Math.round((harinAmount / (totalInScopeActual + harinAmount)) * 100) : 0;
    const hasRelatedAmounts = related.nabipAmount > 0 || related.minapAmount > 0;

    // --- Gyesan (expected) amount ---
    const rawGyesanAmount = this.computeGyesanAmount(ctx, sg, billableAttendanceCount);
    // Apply discount rate to get the expected amount after discount
    const gyesanAmount = harinRate > 0
      ? Math.round(rawGyesanAmount * (1 - harinRate / 100))
      : rawGyesanAmount;
    const chayi = nabipAmount - gyesanAmount;

    // --- Amount breakdown ---
    const actualTotal = nabipAmount + minapAmount;
    const amountBreakdown = this.buildAmountBreakdown(ctx, sg, billableAttendanceCount, actualTotal);

    // --- Enrollment context ---
    const enrollmentContext = this.buildEnrollmentContext(ctx, sg);

    // --- Connection status ---
    const hasError = sgFindings.some((f) => f.severity === 'error');
    const hasWarning = sgFindings.some((f) => f.severity === 'warning');
    const connectionStatus: SugangsaengAnalysisRow['connectionStatus'] = hasError
      ? 'error'
      : hasWarning
        ? 'warning'
        : 'normal';

    // --- Highlights ---
    const nabipHighlight = chayi !== 0 ? { severity: 'warning' as FindingSeverity, message: `차이: ${chayi > 0 ? '+' : ''}${chayi.toLocaleString()}` } : null;
    const chayiHighlight = chayi !== 0 ? { severity: 'error' as FindingSeverity, message: `납입액과 계산액 차이` } : null;
    const harinHighlight = this.buildHarinHighlight(sg, harinRate);
    const statusHighlight: CellHighlight | null = connectionStatus !== 'normal'
      ? { severity: connectionStatus, message: sgFindings.find((f) => f.severity === connectionStatus)?.message ?? '' }
      : null;

    // --- Related amounts finding ---
    if (hasRelatedAmounts) {
      this.addFinding(ctx, 'info', 'timing', 'sugangsaeng.connectedSueomnyos',
        `조회 기간 외 청구 ${related.sueomnyoCount}건에 대해 납입/미납 활동이 이번 기간에 발생`,
        `청구일자가 조회 기간 밖이지만 이번 기간에 납입(${related.nabipAmount.toLocaleString()}) 또는 미납(${related.minapAmount.toLocaleString()})이 있습니다.`,
        {
          scope: { sugangsaengNanoId: sg.nanoId },
          evidence: { relatedNabip: related.nabipAmount, relatedMinap: related.minapAmount, relatedCount: related.sueomnyoCount },
        },
      );
    }

    return {
      sugangsaengNanoId: sg.nanoId,
      sugangsaengName: sg.name,
      isHwalseong: sg.isHwalseong,
      boonbanGroupName: sg.boonbanSugangsaengGroupName ?? null,
      attendanceCells,
      harinRate,
      harinAmount,
      harinHighlight,
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
      hasRelatedAmounts,
      sueomnyoTimingDetails,
      findings: sgFindings,
    };
  }

  // ─── Gyesan Amount Computation ───────────────────────────────────────────

  private computeGyesanAmount(ctx: Ctx, sg: Sugangsaeng, billableCount: number): number {
    // Hoecha part: billable attendance × rate
    // Rate resolution: boon.amount → sueop.amount (fallback)
    let hoechaAmount = 0;
    const hoechaBoons = sg.connectedBoons.filter((b) => {
      const konCategory = this.getKonCategoryForBoon(ctx, b.konNanoId);
      return konCategory === 'hoecha';
    });

    if (hoechaBoons.length > 0) {
      // TODO: per-boon rate might differ. For now use a single rate across all hoecha boons.
      const firstBoon = hoechaBoons[0];
      const sueopBoon = ctx.derived.sueopBoonMap.get(firstBoon.boonNanoId);
      const rate = sueopBoon?.amount ?? ctx.input.sueop.amount ?? 0;
      hoechaAmount = billableCount * rate;
    }

    // Chuga-cheonggu part: sum of kon gibonBoonAmount for connected chuga-cheonggu kons
    let chugaCheongguAmount = 0;
    for (const kon of sg.connectedKons) {
      if (kon.category === 'chuga-cheonggu' && kon.isHwalseongKonSugangsaeng) {
        const sueopKon = ctx.derived.sueopKonMap.get(kon.nanoId);
        chugaCheongguAmount += sueopKon?.gibonBoonAmount ?? 0;
      }
    }

    return hoechaAmount + chugaCheongguAmount;
  }

  // ─── Amount Breakdown Builder ──────────────────────────────────────────

  private buildAmountBreakdown(ctx: Ctx, sg: Sugangsaeng, billableCount: number, actualTotal: number): AmountBreakdown {
    const lines: AmountBreakdownLine[] = [];

    const hoechaBoons = sg.connectedBoons.filter((b) =>
      this.getKonCategoryForBoon(ctx, b.konNanoId) === 'hoecha',
    );
    if (hoechaBoons.length > 0) {
      const firstBoon = hoechaBoons[0];
      const sueopBoon = ctx.derived.sueopBoonMap.get(firstBoon.boonNanoId);
      const rate = sueopBoon?.amount ?? ctx.input.sueop.amount ?? 0;
      if (rate > 0 && billableCount > 0) {
        lines.push({
          label: '회차 수강료',
          konCategory: 'hoecha',
          unitAmount: rate,
          count: billableCount,
          subtotal: rate * billableCount,
          isGuessed: false,
        });
      }
    }

    for (const kon of sg.connectedKons) {
      if (kon.category === 'chuga-cheonggu' && kon.isHwalseongKonSugangsaeng) {
        const sueopKon = ctx.derived.sueopKonMap.get(kon.nanoId);
        const amount = sueopKon?.gibonBoonAmount ?? 0;
        if (amount > 0) {
          lines.push({
            label: sueopKon?.name ?? '추가청구',
            konCategory: 'chuga-cheonggu',
            unitAmount: amount,
            count: 1,
            subtotal: amount,
            isGuessed: false,
          });
        }
      }
    }

    const calculatedTotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const delta = actualTotal - calculatedTotal;

    const parts = lines.map((l) =>
      l.count > 1 ? `${l.unitAmount.toLocaleString()} × ${l.count}회` : `${l.label} ${l.subtotal.toLocaleString()}`,
    );
    const explanation = parts.length > 0
      ? `${parts.join(' + ')} = ${calculatedTotal.toLocaleString()}`
      : '금액 구성 요소 없음';

    return {
      lines,
      calculatedTotal,
      actualTotal,
      delta,
      isFullyExplained: delta === 0,
      explanation,
    };
  }

  // ─── Enrollment Context Builder ────────────────────────────────────────

  private buildEnrollmentContext(ctx: Ctx, sg: Sugangsaeng): EnrollmentContext {
    const naeyeoks = sg.sugangNaeyeoks ?? [];
    const ipbanDates = naeyeoks.map((n) => n.ipbanAt).sort();
    const toebanDates = naeyeoks.map((n) => n.toebanAt).filter(Boolean) as string[];

    const ipbanAt = ipbanDates[0] ?? null;
    const toebanAt = toebanDates.length > 0 ? toebanDates[toebanDates.length - 1] : null;

    const periodStart = new Date(ctx.input.queryPeriod.startAt);
    const periodEnd = new Date(ctx.input.queryPeriod.endAt);

    const enteredDuringPeriod = ipbanAt !== null
      && new Date(ipbanAt) >= periodStart
      && new Date(ipbanAt) <= periodEnd;

    const leftDuringPeriod = toebanAt !== null
      && new Date(toebanAt) >= periodStart
      && new Date(toebanAt) <= periodEnd;

    const hasPriorMonthActivity = sg.connectedSueomnyos.some((sm) => {
      if (sm.cheongguAt && new Date(sm.cheongguAt) < periodStart) return true;
      return sg.connectedBoons.some((b) =>
        b.boonIljeong && new Date(b.boonIljeong.startAt) < periodStart,
      );
    });

    return { ipbanAt, toebanAt, enteredDuringPeriod, leftDuringPeriod, hasPriorMonthActivity };
  }

  // ─── Timing Details Builder ──────────────────────────────────────────────

  private buildTimingDetails(ctx: Ctx, sg: Sugangsaeng): SueomnyoTimingDetail[] {
    const { queryPeriod } = ctx.input;

    return sg.connectedSueomnyos.map((sm) => {
      const activeBubuns = sm.bubunCheonggus.filter((b) => !b.isChwiso);
      const totalNabip = activeBubuns.reduce((s, b) => s + b.nabipAmount, 0);
      const totalMinap = activeBubuns.reduce((s, b) => s + b.minapAmount, 0);
      const totalHarin = activeBubuns.reduce((s, b) => s + b.harinAmount, 0);
      const totalActual = activeBubuns.reduce((s, b) => s + b.actualAmount, 0);

      const nabipTimestamp = this.resolveNabipTimestamp(activeBubuns);

      const konCategory = sm.boonNanoId
        ? this.getKonCategoryForBoon(ctx, sg.connectedBoons.find((b) => b.boonNanoId === sm.boonNanoId)?.konNanoId ?? '')
        : null;

      const scopeCategory = this.classifySueomnyoScope(sm, nabipTimestamp, queryPeriod);

      return {
        cheongguNanoId: sm.cheongguNanoId,
        cheongguName: sm.cheongguName,
        boonNanoId: sm.boonNanoId,
        konCategory,
        scopeCategory,
        cheongguCreatedAt: sm.createdAt ?? null,
        cheongguAt: sm.cheongguAt,
        nabipTimestamp,
        totalActualAmount: totalActual,
        totalNabipAmount: totalNabip,
        totalMinapAmount: totalMinap,
        totalHarinAmount: totalHarin,
        hasConcern: totalMinap > 0,
      };
    });
  }

  private resolveNabipTimestamp(bubuns: BubunCheonggu[]): string | null {
    for (const b of bubuns) {
      if (b.sunap?.sunapLatestBubunGyeoljeUpdateAt) return b.sunap.sunapLatestBubunGyeoljeUpdateAt;
      if (b.sunap?.createdAt) return b.sunap.createdAt;
      if (b.updatedAt != null) return b.updatedAt;
    }
    return null;
  }

  // ─── Sueop Summary Builder ──────────────────────────────────────────────

  private buildSueopSummary(ctx: Ctx, rows: SugangsaengAnalysisRow[]): SueopSummary {
    return {
      sueopNanoId: ctx.input.sueop.nanoId,
      sueopName: ctx.input.sueop.name,
      queryPeriod: ctx.input.queryPeriod,
      totalSugangsaengCount: rows.length,
      activeSugangsaengCount: rows.filter((r) => r.isHwalseong).length,
      totalBillableAttendanceCount: rows.reduce((s, r) => s + r.billableAttendanceCount, 0),
      expectedTotalAmount: rows.reduce((s, r) => s + r.gyesanAmount, 0),
      inScope: {
        nabipTotal: rows.reduce((s, r) => s + r.inScope.nabipAmount, 0),
        minapTotal: rows.reduce((s, r) => s + r.inScope.minapAmount, 0),
        harinTotal: rows.reduce((s, r) => s + r.inScope.harinAmount, 0),
      },
      related: {
        nabipTotal: rows.reduce((s, r) => s + r.related.nabipAmount, 0),
        minapTotal: rows.reduce((s, r) => s + r.related.minapAmount, 0),
        harinTotal: rows.reduce((s, r) => s + r.related.harinAmount, 0),
        sugangsaengCount: rows.filter((r) => r.hasRelatedAmounts).length,
      },
      totalChayi: rows.reduce((s, r) => s + r.chayi, 0),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private classifySueomnyoScope(
    sm: ConnectedSueomnyo,
    nabipTimestamp: string | null,
    queryPeriod: QueryPeriod,
  ): SueomnyoScopeCategory {
    const periodStart = new Date(queryPeriod.startAt);
    const periodEnd = new Date(queryPeriod.endAt);

    const cheongguDate = sm.cheongguAt ? new Date(sm.cheongguAt) : null;
    const cheongguInScope = cheongguDate !== null && cheongguDate >= periodStart && cheongguDate <= periodEnd;

    if (cheongguInScope) return 'in-scope';

    const nabipDate = nabipTimestamp ? new Date(nabipTimestamp) : null;
    const nabipInPeriod = nabipDate !== null && nabipDate >= periodStart && nabipDate <= periodEnd;

    const sunapDates = sm.bubunCheonggus
      .filter((b) => !b.isChwiso && b.sunap)
      .map((b) => new Date(b.sunap!.createdAt));
    const anySunapInPeriod = sunapDates.some((d) => d >= periodStart && d <= periodEnd);

    if (nabipInPeriod || anySunapInPeriod) return 'related';

    return 'out-of-scope';
  }

  private getKonCategoryForBoon(ctx: Ctx, konNanoId: string): 'hoecha' | 'chuga-cheonggu' | null {
    return ctx.derived.sueopKonMap.get(konNanoId)?.konCategory ?? null;
  }

  private getWorstSeverity(findings: ValidationFinding[]): FindingSeverity | null {
    if (findings.some((f) => f.severity === 'error')) return 'error';
    if (findings.some((f) => f.severity === 'warning')) return 'warning';
    if (findings.some((f) => f.severity === 'info')) return 'info';
    return null;
  }

  private buildHarinHighlight(sg: Sugangsaeng, harinRate: number): CellHighlight | null {
    // If bigo mentions 할인 but rate is 0, or rate is nonzero and unexpected
    const hasBigoHarin = sg.connectedSueomnyos.some(
      (s) => s.cheongguBigo?.includes('할인') || s.bubunCheonggus.some((b) => b.bubunCheongguBigo?.includes('할인')),
    );
    if (hasBigoHarin && harinRate === 0) {
      return { severity: 'warning', message: '비고에 할인 언급이 있으나 할인 금액이 0' };
    }
    if (harinRate > 0) {
      return { severity: 'info', message: `할인 ${harinRate}% 적용됨` };
    }
    return null;
  }

  // ─── Finding Helpers ────────────────────────────────────────────────────

  protected addFinding(
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
