import type { CellHighlight, ValidationFinding } from '../validator-strategy.type';

export type HVectorCategory =
  | 'chulseok-site'
  | 'chulseok-online'
  | 'jigak'
  | 'other-boonban'
  | 'absent'
  | 'mihwagin';

export type KonCategory = 'hoecha' | 'chuga-cheonggu';

export interface SueopAggregateInput {
  queryPeriod: {
    startAt: string;
    endAt: string;
  };
  sueop: {
    nanoId: string;
    name: string;
    amount: number;
    kons: Array<{
      nanoId: string;
      name: string;
      konCategory: KonCategory;
      gibonBoonAmount: number;
      gibonBoonNanoId: string;
    }>;
    boons: Array<{
      nanoId: string;
      name: string;
      amount: number;
    }>;
  };
  sugangsaengs: Array<{
    nanoId: string;
    name: string;
    connectedKons: Array<{
      category: KonCategory;
      nanoId: string;
      konName: string;
      gibonBoonNanoId: string;
    }>;
    connectedBoons: Array<{
      boonNanoId: string;
      konNanoId: string;
      boonName: string;
      boonIljeong: { startAt: string; endAt: string };
    }>;
    connectedChulseokWorkBranches: Array<{
      boonNanoId: string;
      workNanoId: string;
      workBranchNanoId: string;
      hVector: {
        hVectorNanoId: string;
        hVectorHwaginCategory: HVectorCategory;
      };
    }>;
    connectedSueomnyos: Array<{
      boonNanoId: string | null;
      cheongguName: string;
      cheongguTotalAmount: number;
      cheongguTotalHarinAmount: number;
      cheongguTotalActualAmount: number;
      cheongguDisplayAmount: number;
      cheongguNanoId: string;
      cheongguAt: string | null;
      bubunCheonggus: Array<{
        nanoId: string;
        isChwiso: boolean;
        name: string;
        bubunCheongguAmount: number;
        harinAmount: number;
        actualAmount: number;
        displayAmount: number;
        nabipAmount: number;
        minapAmount: number;
        sunap: string | null;
      }>;
    }>;
  }>;
}

export interface AttendanceCell {
  date: string;
  hVectorCategory: HVectorCategory | null;
  highlight: CellHighlight | null;
}

export interface SugangsaengAnalysisRow {
  sugangsaengNanoId: string;
  sugangsaengName: string;
  attendanceCells: AttendanceCell[];
  chulseokCount: number;
  gyesanAmount: number;
  nabipAmount: number;
  minapAmount: number;
  harinAmount: number;
  chayi: number;
  chayiHighlight: CellHighlight | null;
  statusHighlight: CellHighlight | null;
  findings: ValidationFinding[];
}

export interface AmountBreakdownLine {
  label: string;
  amount: number;
}

export interface AmountBreakdown {
  lines: AmountBreakdownLine[];
  total: number;
}

export interface EnrollmentContext {
  totalSugangsaeng: number;
  activeSugangsaeng: number;
}

export interface SueomnyoTimingDetail {
  sugangsaengName: string;
  cheongguAt: string | null;
  nabipAt: string | null;
}

export interface SueopSummary {
  expectedTotalAmount: number;
  inScope: {
    nabipTotal: number;
    minapTotal: number;
    harinTotal: number;
  };
  totalChayi: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  enrollment: EnrollmentContext;
}

export interface SueopAggregateReport {
  sueopName: string;
  sueopNanoId: string;
  queryPeriod: { startAt: string; endAt: string };
  analysisRows: SugangsaengAnalysisRow[];
  findings: ValidationFinding[];
  sueopSummary: SueopSummary;
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  amountBreakdown: AmountBreakdown;
}
