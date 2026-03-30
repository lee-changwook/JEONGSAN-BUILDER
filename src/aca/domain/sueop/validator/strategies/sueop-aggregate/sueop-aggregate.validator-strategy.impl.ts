import type { ValidatorStrategy } from '../validator-strategy';
import type { ValidatorResult, ValidationFinding, CellHighlight } from '../validator-strategy.type';
import type {
  SueopAggregateInput,
  SueopAggregateReport,
  SugangsaengAnalysisRow,
  AttendanceCell,
  HVectorCategory,
} from './sueop-aggregate.validator-strategy.type';

const BILLABLE_CATEGORIES: HVectorCategory[] = [
  'chulseok-site',
  'chulseok-online',
  'jigak',
  'other-boonban',
];

function isBillable(cat: HVectorCategory): boolean {
  return BILLABLE_CATEGORIES.includes(cat);
}

function buildAnalysisRow(
  sg: SueopAggregateInput['sugangsaengs'][number],
  boonDates: Array<{ nanoId: string; date: string }>,
  sessionAmount: number,
  totalBoons: number,
  gyojaeBi: number,
): SugangsaengAnalysisRow {
  const attendanceCells: AttendanceCell[] = boonDates.map((bd) => {
    const wb = sg.connectedChulseokWorkBranches.find((w) => w.boonNanoId === bd.nanoId);
    return {
      date: bd.date,
      hVectorCategory: wb?.hVector.hVectorHwaginCategory ?? null,
      highlight: null,
    };
  });

  const chulseokCount = attendanceCells.filter(
    (c) => c.hVectorCategory !== null && isBillable(c.hVectorCategory),
  ).length;

  const sueomnyos = sg.connectedSueomnyos;
  const totalCheonggu = sueomnyos.reduce((acc, s) => acc + s.cheongguTotalAmount, 0);
  const totalHarin = sueomnyos.reduce((acc, s) => acc + s.cheongguTotalHarinAmount, 0);
  const totalActual = sueomnyos.reduce((acc, s) => acc + s.cheongguTotalActualAmount, 0);

  const bubuns = sueomnyos.flatMap((s) => s.bubunCheonggus).filter((b) => !b.isChwiso);
  const nabipAmount = bubuns.reduce((acc, b) => acc + b.nabipAmount, 0);
  const minapAmount = bubuns.reduce((acc, b) => acc + b.minapAmount, 0);

  const gyesanAmount = sessionAmount * totalBoons + gyojaeBi;
  const discountedGyesan = totalHarin > 0 ? gyesanAmount - totalHarin : gyesanAmount;
  const rawChayi = nabipAmount - discountedGyesan;
  const chayi = Math.abs(rawChayi) <= 1 ? 0 : rawChayi;

  let chayiHighlight: CellHighlight | null = null;
  if (chayi !== 0) {
    chayiHighlight = {
      severity: 'error',
      message: `납입액과 계산 금액 차이: ${chayi.toLocaleString()}원`,
    };
  }

  return {
    sugangsaengNanoId: sg.nanoId,
    sugangsaengName: sg.name,
    attendanceCells,
    chulseokCount,
    gyesanAmount: discountedGyesan,
    nabipAmount,
    minapAmount,
    harinAmount: totalHarin,
    chayi,
    chayiHighlight,
    statusHighlight: null,
    findings: [],
  };
}

function generateFindings(
  rows: SugangsaengAnalysisRow[],
  input: SueopAggregateInput,
  sessionAmount: number,
  totalBoons: number,
  gyojaeBi: number,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  let seq = 1;

  function addFinding(
    severity: ValidationFinding['severity'],
    category: string,
    message: string,
    reason: string,
    evidence: Record<string, string | number>,
    suggestion: string,
    scope: ValidationFinding['scope'],
  ) {
    findings.push({
      id: `f-${String(seq++).padStart(3, '0')}`,
      severity,
      category,
      message,
      reason,
      evidence,
      suggestion,
      scope,
    });
  }

  for (const row of rows) {
    const sgScope = { sugangsaengNanoId: row.sugangsaengNanoId, boonNanoId: null };

    if (row.chayi !== 0) {
      const isGyojaebiIncluded = gyojaeBi > 0 && Math.abs(row.chayi) === gyojaeBi;
      const missedSessions = sessionAmount > 0 ? Math.abs(row.chayi) / sessionAmount : 0;
      const isMissedMultiple = sessionAmount > 0 && missedSessions >= 1 && Math.abs(row.chayi) % sessionAmount === 0;

      if (isGyojaebiIncluded) {
        addFinding(
          'warning',
          'amount-guess',
          '교재비가 포함되어 납입된 것으로 보입니다',
          `차이(${row.chayi.toLocaleString()}원)가 교재비(${gyojaeBi.toLocaleString()}원)와 일치`,
          { chayi: row.chayi, gyojaeBi },
          '교재비 별도 청구 여부를 확인하세요',
          sgScope,
        );
      } else if (isMissedMultiple) {
        const n = Math.round(missedSessions);
        addFinding(
          'error',
          'chulseok-sueomnyo',
          `수강료 ${n}회분이 ${row.chayi < 0 ? '누락' : '초과'}된 것으로 보입니다`,
          `1회 수강료: ${sessionAmount.toLocaleString()}원 × ${n}회 = ${Math.abs(row.chayi).toLocaleString()}원`,
          { sessionAmount, missedCount: n, chayi: row.chayi },
          row.chayi < 0
            ? '해당 회차의 출결 기록 또는 청구 내역을 확인하세요'
            : '중복 청구 또는 잘못된 회차 설정을 확인하세요',
          sgScope,
        );
      } else {
        addFinding(
          'error',
          'chulseok-sueomnyo',
          `청구 금액과 계산 금액 불일치`,
          `계산: ${row.gyesanAmount.toLocaleString()}원 / 납입: ${row.nabipAmount.toLocaleString()}원 (차이: ${row.chayi.toLocaleString()}원)`,
          { gyesanAmount: row.gyesanAmount, nabipAmount: row.nabipAmount, chayi: row.chayi },
          '실강횟수, 회차별 수업료, 할인 여부를 재확인하세요',
          sgScope,
        );
      }
    }

    if (row.harinAmount > 0 && row.chayi > 0) {
      const fullAmount = sessionAmount * totalBoons + gyojaeBi;
      const expectedDiscount = fullAmount - row.gyesanAmount;
      if (Math.abs(row.chayi) >= expectedDiscount * 0.8) {
        addFinding(
          'error',
          'chulseok-sueomnyo',
          `할인 적용이 납입액에 반영되지 않은 것으로 보입니다`,
          `할인액: ${row.harinAmount.toLocaleString()}원 / 차이: ${row.chayi.toLocaleString()}원`,
          { harinAmount: row.harinAmount, chayi: row.chayi },
          '할인율 적용 여부를 재확인하세요',
          sgScope,
        );
      }
    }

    const attendanceRate = totalBoons > 0 ? row.chulseokCount / totalBoons : 1;
    if (attendanceRate < 0.5 && totalBoons >= 4) {
      addFinding(
        'warning',
        'attendance',
        `출석률 저조 (${(attendanceRate * 100).toFixed(0)}%)`,
        `총 ${totalBoons}회 중 ${row.chulseokCount}회 출석`,
        { totalBoons, chulseokCount: row.chulseokCount, attendanceRate: Math.round(attendanceRate * 100) },
        '학생 상담 및 환불 검토가 필요합니다',
        sgScope,
      );
    }

    if (row.minapAmount > 0) {
      addFinding(
        'warning',
        'sueomnyo-existence',
        `미납액 ${row.minapAmount.toLocaleString()}원이 존재합니다`,
        `납입: ${row.nabipAmount.toLocaleString()}원 / 미납: ${row.minapAmount.toLocaleString()}원`,
        { nabipAmount: row.nabipAmount, minapAmount: row.minapAmount },
        '미납 사유를 확인하고 수납을 요청하세요',
        sgScope,
      );
    }

    for (const cell of row.attendanceCells) {
      if (cell.hVectorCategory === 'mihwagin') {
        addFinding(
          'warning',
          'attendance',
          `${cell.date} 출결 미확인 상태`,
          `해당 일자의 출결이 확인되지 않았습니다`,
          { date: cell.date },
          '출결 상태를 확인하여 입력하세요',
          { sugangsaengNanoId: row.sugangsaengNanoId, boonNanoId: null },
        );
        cell.highlight = { severity: 'warning', message: '출결 미확인' };
      }
    }

    const absentCount = row.attendanceCells.filter((c) => c.hVectorCategory === 'absent').length;
    if (absentCount > 0 && row.minapAmount === 0 && row.chayi === 0) {
      addFinding(
        'warning',
        'amount-guess',
        `결석 ${absentCount}회인데 수강료가 전액 납입되었습니다`,
        `결석: ${absentCount}회 / 납입: ${row.nabipAmount.toLocaleString()}원 (기대: ${row.gyesanAmount.toLocaleString()}원)`,
        { absentCount, nabipAmount: row.nabipAmount, gyesanAmount: row.gyesanAmount },
        '환불 또는 보강 처리 여부를 확인하세요',
        sgScope,
      );
    }

    const jigakCount = row.attendanceCells.filter((c) => c.hVectorCategory === 'jigak').length;
    const recordedCount = row.attendanceCells.filter((c) => c.hVectorCategory !== null).length;
    if (jigakCount > 0 && recordedCount > 0 && jigakCount / recordedCount >= 0.5) {
      addFinding(
        'warning',
        'attendance',
        `지각(영상대체) 비율이 높습니다 (${jigakCount}/${recordedCount}회)`,
        `전체 ${recordedCount}회 중 ${jigakCount}회 지각 처리`,
        { jigakCount, recordedCount },
        '실제 영상 발송 여부를 확인하세요',
        sgScope,
      );
    }

    if (row.chulseokCount === 0 && row.nabipAmount > 0) {
      addFinding(
        'error',
        'chulseok-sueomnyo',
        `출석 0회인데 납입액이 있습니다`,
        `납입: ${row.nabipAmount.toLocaleString()}원 / 출석: 0회`,
        { nabipAmount: row.nabipAmount, chulseokCount: 0 },
        '수강료 청구 누락 또는 퇴원 처리 여부를 확인하세요',
        sgScope,
      );
    }

    if (row.nabipAmount === 0 && row.minapAmount === 0 && row.chulseokCount > 0) {
      addFinding(
        'error',
        'chulseok-sueomnyo',
        `출석 ${row.chulseokCount}회인데 납입액이 없습니다`,
        `출석: ${row.chulseokCount}회 / 납입: 0원 / 미납: 0원`,
        { chulseokCount: row.chulseokCount },
        '수강료가 청구되지 않았을 수 있습니다. 확인하세요',
        sgScope,
      );
    }

    const filledCells = row.attendanceCells.filter((c) => c.hVectorCategory !== null);
    const emptyCells = row.attendanceCells.filter((c) => c.hVectorCategory === null);
    if (filledCells.length > 0 && emptyCells.length > 0) {
      const firstFilledIdx = row.attendanceCells.findIndex((c) => c.hVectorCategory !== null);
      const allLeadingEmpty = row.attendanceCells.slice(0, firstFilledIdx).every((c) => c.hVectorCategory === null);
      const allTrailingFilled = row.attendanceCells.slice(firstFilledIdx).filter((c) => c.hVectorCategory === null).length === 0;
      if (firstFilledIdx > 0 && allLeadingEmpty && allTrailingFilled) {
        addFinding(
          'info',
          'enrollment',
          `${firstFilledIdx + 1}회차부터 출석 — 중간 입반 추정`,
          `${firstFilledIdx}회차까지 출결 기록 없음, ${firstFilledIdx + 1}회차부터 출석 시작`,
          { firstAttendedSession: firstFilledIdx + 1, emptyBefore: firstFilledIdx },
          '중간 입반 학생이면 정상입니다. 수강료 회차를 확인하세요',
          sgScope,
        );
      }
    }
  }

  const activeRows = rows.filter((r) => r.nabipAmount > 0);
  if (activeRows.length >= 3) {
    const amounts = activeRows.map((r) => r.nabipAmount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
    const stddev = Math.sqrt(variance);

    if (stddev > 0) {
      for (const row of activeRows) {
        const zScore = Math.abs(row.nabipAmount - mean) / stddev;
        if (zScore > 1.5) {
          const isHighOutlier = row.nabipAmount > mean * 1.8;
          const excessSessions = sessionAmount > 0 ? Math.round((row.nabipAmount - mean) / sessionAmount) : 0;
          addFinding(
            'warning',
            'anomaly',
            isHighOutlier
              ? `납입액이 다른 학생보다 현저히 높습니다`
              : `납입액이 다른 학생 대비 비정상적입니다`,
            `납입: ${row.nabipAmount.toLocaleString()}원 / 평균: ${Math.round(mean).toLocaleString()}원 (z=${zScore.toFixed(1)})`,
            { nabipAmount: row.nabipAmount, mean: Math.round(mean), zScore: parseFloat(zScore.toFixed(1)) },
            isHighOutlier && excessSessions > 0
              ? `이전 달 동영상 수강분(약 ${excessSessions}회분)이 합산된 것일 수 있습니다. 종이 출석부를 확인하세요`
              : '납입 금액을 재확인하세요',
            { sugangsaengNanoId: row.sugangsaengNanoId, boonNanoId: null },
          );
        }
      }
    }
  }

  if (gyojaeBi > 0 && activeRows.length >= 2) {
    const expectedWithGyojae = sessionAmount * totalBoons + gyojaeBi;
    const expectedWithout = sessionAmount * totalBoons;
    const withGyojae: string[] = [];
    const withoutGyojae: string[] = [];
    for (const row of activeRows) {
      const total = row.nabipAmount + row.minapAmount;
      if (Math.abs(total - expectedWithGyojae) <= 1) withGyojae.push(row.sugangsaengName);
      else if (Math.abs(total - expectedWithout) <= 1) withoutGyojae.push(row.sugangsaengName);
    }
    if (withGyojae.length > 0 && withoutGyojae.length > 0) {
      for (const row of activeRows) {
        const total = row.nabipAmount + row.minapAmount;
        if (Math.abs(total - expectedWithout) <= 1) {
          addFinding(
            'warning',
            'amount-guess',
            `교재비가 포함되지 않은 것으로 보입니다`,
            `납입+미납: ${total.toLocaleString()}원 / 교재비 포함 시: ${expectedWithGyojae.toLocaleString()}원`,
            { total, expectedWithGyojae, gyojaeBi },
            `같은 반 ${withGyojae.length}명은 교재비 포함 금액입니다. 교재비 청구 여부를 확인하세요`,
            { sugangsaengNanoId: row.sugangsaengNanoId, boonNanoId: null },
          );
        }
      }
    }
  }

  if (rows.length > 0) {
    const boonCount = rows[0].attendanceCells.length;
    for (let bi = 0; bi < boonCount; bi += 1) {
      const date = rows[0].attendanceCells[bi]?.date;
      if (!date) continue;
      const allEmpty = rows.every((r) => r.attendanceCells[bi]?.hVectorCategory === null);
      const allAbsent = rows.every((r) => {
        const cat = r.attendanceCells[bi]?.hVectorCategory;
        return cat === null || cat === 'absent';
      });
      if (allEmpty || allAbsent) {
        const hasAnyRecord = rows.some((r) =>
          r.attendanceCells.some((c, ci) => ci !== bi && c.hVectorCategory !== null),
        );
        if (hasAnyRecord) {
          const isFirstSession = bi === 0;
          addFinding(
            'info',
            'schedule',
            isFirstSession
              ? `${date} (1회차) — 전체 학생 출결 미입력`
              : `${date} — 전체 학생 출결 기록 없음`,
            isFirstSession
              ? `첫 수업은 명단 미확정으로 종이 출석부만 기록된 경우가 많습니다`
              : `해당 일자에 모든 학생의 출결이 비어있습니다`,
            { date, sessionIndex: bi + 1 },
            isFirstSession
              ? '종이 출석부를 확인하여 아카에 입력하세요'
              : '휴강이었다면 정상입니다. 출결 누락이 아닌지 확인하세요',
            { sugangsaengNanoId: null, boonNanoId: null },
          );
        }
      }
    }
  }

  for (const row of rows) {
    row.findings = findings.filter(
      (f) => f.scope?.sugangsaengNanoId === row.sugangsaengNanoId || f.scope?.sugangsaengNanoId === null,
    );
  }

  return findings;
}

export class SueopAggregateValidatorStrategy
  implements ValidatorStrategy<SueopAggregateInput, SueopAggregateReport> {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  run(input: SueopAggregateInput): ValidatorResult<SueopAggregateReport> {
    const { sueop, sugangsaengs, queryPeriod } = input;

    const hoechaKon = sueop.kons.find((k) => k.konCategory === 'hoecha');
    const chugaKon = sueop.kons.find((k) => k.konCategory === 'chuga-cheonggu');
    const sessionAmount = hoechaKon?.gibonBoonAmount ?? sueop.amount;
    const gyojaeBi = chugaKon?.gibonBoonAmount ?? 0;

    const hoechaBoons = sueop.boons.filter((b) => {
      if (chugaKon) {
        return b.nanoId !== chugaKon.gibonBoonNanoId;
      }
      return true;
    });
    const totalBoons = hoechaBoons.length;

    const boonDates = hoechaBoons.map((b) => ({
      nanoId: b.nanoId,
      date: b.name,
    }));

    const analysisRows = sugangsaengs.map((sg) =>
      buildAnalysisRow(sg, boonDates, sessionAmount, totalBoons, gyojaeBi),
    );

    const findings = generateFindings(analysisRows, input, sessionAmount, totalBoons, gyojaeBi);

    const errorCount = findings.filter((f) => f.severity === 'error').length;
    const warningCount = findings.filter((f) => f.severity === 'warning').length;
    const infoCount = findings.filter((f) => f.severity === 'info').length;

    const nabipTotal = analysisRows.reduce((a, r) => a + r.nabipAmount, 0);
    const minapTotal = analysisRows.reduce((a, r) => a + r.minapAmount, 0);
    const harinTotal = analysisRows.reduce((a, r) => a + r.harinAmount, 0);
    const expectedTotalAmount = (sessionAmount * totalBoons + gyojaeBi) * sugangsaengs.length;
    const totalChayi = analysisRows.reduce((a, r) => a + r.chayi, 0);

    const report: SueopAggregateReport = {
      sueopName: sueop.name,
      sueopNanoId: sueop.nanoId,
      queryPeriod,
      analysisRows,
      findings,
      sueopSummary: {
        expectedTotalAmount,
        inScope: { nabipTotal, minapTotal, harinTotal },
        totalChayi,
        errorCount,
        warningCount,
        infoCount,
        enrollment: {
          totalSugangsaeng: sugangsaengs.length,
          activeSugangsaeng: sugangsaengs.length,
        },
      },
      summary: { errorCount, warningCount, infoCount },
      amountBreakdown: {
        lines: [
          { label: '수업료', amount: sessionAmount * totalBoons * sugangsaengs.length },
          ...(gyojaeBi > 0 ? [{ label: '교재비', amount: gyojaeBi * sugangsaengs.length }] : []),
          ...(harinTotal > 0 ? [{ label: '할인', amount: -harinTotal }] : []),
        ],
        total: expectedTotalAmount - harinTotal,
      },
    };

    return { success: true, payload: report };
  }
}
