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
      } else {
        addFinding(
          'error',
          'chulseok-sueomnyo',
          `청구 금액과 계산 금액 불일치`,
          `계산: ${row.gyesanAmount.toLocaleString()}원 / 납입: ${row.nabipAmount.toLocaleString()}원 (차이: ${row.chayi.toLocaleString()}원)`,
          { gyesanAmount: row.gyesanAmount, nabipAmount: row.nabipAmount, chayi: row.chayi },
          '회차별 일정, 회차별 수업료, 할인 여부를 재확인하세요',
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
        '미납 사유를 확인하고 수납 처리하세요',
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
          addFinding(
            'warning',
            'anomaly',
            `납입액이 다른 학생 대비 비정상적입니다`,
            `납입: ${row.nabipAmount.toLocaleString()}원 / 평균: ${Math.round(mean).toLocaleString()}원 (z=${zScore.toFixed(1)})`,
            { nabipAmount: row.nabipAmount, mean: Math.round(mean), zScore: parseFloat(zScore.toFixed(1)) },
            '납입 금액을 재확인하세요',
            { sugangsaengNanoId: row.sugangsaengNanoId, boonNanoId: null },
          );
        }
      }
    }
  }

  for (const row of rows) {
    row.findings = findings.filter(
      (f) => f.scope?.sugangsaengNanoId === row.sugangsaengNanoId,
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
