import { z } from 'zod';
import type { ValidationFinding, ValidationReport, CellHighlight } from '../validator-strategy.type';

// ═══════════════════════════════════════════════════════════════════════════════
// Input Schemas
// ═══════════════════════════════════════════════════════════════════════════════
//
// Fields marked [COMPAT:optional] are nullable/optional because ACA2000 compat
// mode cannot provide them. Teachita mode always fills these.
// Fields marked [COMPAT:user-input] must be provided by the user in compat mode.
// Fields marked [COMPAT:derived] can be derived from the ACA2000 CSV.

const KonCategorySchema = z.enum(['hoecha', 'chuga-cheonggu']); // TODO: check kon categories

const HVectorCategorySchema = z.enum([
  'chulseok-site',
  'chulseok-online',
  'jigak',
  'bogang',
  'other-boonban',
  'absent',
  'mihwagin',
]);

const ConnectedKonSchema = z.object({
  category: KonCategorySchema,
  nanoId: z.string(),
  konName: z.string(),
  isHwalseongKonSugangsaeng: z.boolean().optional().default(true), // [COMPAT:optional] assume true
  isHwalseongKon: z.boolean().optional().default(true), // [COMPAT:optional] assume true
  gibonBoonNanoId: z.string(),
});

const ConnectedBoonSchema = z.object({
  boonNanoId: z.string(),
  konNanoId: z.string(), // 맵핑용
  boonName: z.string(),
  boonIljeong: z
    .object({
      startAt: z.string(),
      endAt: z.string(),
    })
    .nullable(), // 실제 강의의 시간에 대한 정보를 가짐. [COMPAT:derived] from CSV date columns
  boonSugangsaengCreatedAt: z.string().nullable().optional(), // [COMPAT:optional] ACA has no creation timestamp
  isHwalseongBoonSugangsaeng: z.boolean().optional().default(true), // [COMPAT:optional] assume true
  isHwalseongBoon: z.boolean().optional().default(true), // [COMPAT:optional] assume true
  boonbanSugangsaengGroupName: z.string().nullable().optional(), // [COMPAT:optional]
  boonbanSugangsaengGroupNanoId: z.string().nullable().optional(), // [COMPAT:optional]
});

const HVectorSchema = z.object({
  hVectorNanoId: z.string(),
  hVectorHwaginCategory: HVectorCategorySchema, // [COMPAT:derived] 출→chulseok-site, 지→jigak, empty→mihwagin
  hVectorYejeongCategory: HVectorCategorySchema.nullable().optional(), // [COMPAT:optional] ACA has no planned category
  hVectorUpdatedAt: z.string().nullable().optional(), // [COMPAT:optional] 출결 찍은 시간
  hVectorCreatedAt: z.string().nullable().optional(), // [COMPAT:optional] 큰 의미 없음
  hVectorBigo: z.string().nullable().optional(), // [COMPAT:optional] 메모 표기용
});

const ConnectedChulseokWorkBranchSchema = z.object({
  boonNanoId: z.string(), // 맵핑용
  workNanoId: z.string(),
  workBranchNanoId: z.string(),
  workName: z.string().optional().default(''), // [COMPAT:optional] ACA has no work concept
  workBranchName: z.string().optional().default(''), // [COMPAT:optional]
  hVector: HVectorSchema,
  isHwalseongSugangsaengXGroup: z.boolean().optional().default(true), // [COMPAT:optional]
});

const SunapSchema = z.object({
  createdAt: z.string(), // 수납 생성 시간 (납입 시간 후보 2)
  name: z.string(),
  nanoId: z.string(),
  sunapLatestBubunGyeoljeUpdateAt: z.string().nullable(), // 수납 최종 수정 시간 (납입 시간 후보 3)
});

const BubunCheongguSchema = z.object({
  nanoId: z.string(),
  isChwiso: z.boolean(),
  name: z.string(),
  createdAt: z.string().nullable().optional(), // [COMPAT:optional]
  updatedAt: z.string().nullable().optional(), // [COMPAT:optional] 최종 수정 시간 (납입 시간 후보 1)
  bubunCheongguAmount: z.number(),
  bubunCheongguBigo: z.string().nullable().optional(), // [COMPAT:optional] 부분 청구 비고
  harinAmount: z.number(),
  actualAmount: z.number(),
  displayAmount: z.number(),
  nabipAmount: z.number(),
  minapAmount: z.number(),
  sunap: SunapSchema.nullable(), // [COMPAT:optional] — null in compat mode (no sunap entity)
});

const SaeopjaSchema = z.object({
  createdAt: z.string(),
  name: z.string(),
});

const ConnectedSueomnyoSchema = z.object({
  boonNanoId: z.string().nullable(), // 맵핑용
  cheongguName: z.string(),
  cheongguBigo: z.string().nullable().optional(), // [COMPAT:optional]
  cheongguTotalAmount: z.number(), // 부분청구합계
  cheongguTotalHarinAmount: z.number(), // 부분청구합계
  cheongguTotalActualAmount: z.number(), // 부분청구합계
  cheongguDisplayAmount: z.number(),
  cheongguNanoId: z.string(),
  cheongguAt: z.string().nullable(), // [COMPAT:optional] — null in compat mode
  createdAt: z.string().nullable().optional(), // [COMPAT:optional] 수업료를 발생시킨 시간
  bubunCheonggus: z.array(BubunCheongguSchema), // [COMPAT:simplified] — single bubunCheonggu with aggregated amounts
  saeopja: SaeopjaSchema.nullable().optional(), // [COMPAT:optional]
});

const AllimSchema = z.object({
  nanoId: z.string(),
  title: z.string(),
  content: z.string(),
});

const SugangNaeyeokSchema = z.object({
  nanoId: z.string(),
  createdAt: z.string(), // 수강 내역이 생성된 시간
  ipbanAt: z.string(),
  toebanAt: z.string().nullable(),
});

const SugangsaengSchema = z.object({
  nanoId: z.string(),
  name: z.string(), // [COMPAT:derived] from CSV 이름 column
  boonbanSugangsaengGroupName: z.string().nullable().optional(), // [COMPAT:optional]
  boonbanSugangsaengGroupNanoId: z.string().nullable().optional(), // [COMPAT:optional]
  isHwalseong: z.boolean().optional().default(true), // [COMPAT:optional] assume true if in CSV
  isJaewonCategory: z.boolean().optional().default(true), // [COMPAT:optional]
  sugangNaeyeoks: z.array(SugangNaeyeokSchema).optional().default([]), // [COMPAT:optional] ACA has no enrollment history
  connectedKons: z.array(ConnectedKonSchema), // [COMPAT:derived] single hoecha kon + optional chuga-cheonggu from user input
  connectedBoons: z.array(ConnectedBoonSchema), // [COMPAT:derived] from CSV date columns
  connectedChulseokWorkBranches: z.array(ConnectedChulseokWorkBranchSchema), // [COMPAT:derived] from CSV attendance cells
  connectedSueomnyos: z.array(ConnectedSueomnyoSchema), // [COMPAT:derived] single sueomnyo from nabip/minap string
  sugangsaengAllims: z.array(AllimSchema).optional().default([]), // [COMPAT:optional] 문자 내역 조회 용
  jaewonsaengAllims: z.array(AllimSchema).optional().default([]), // [COMPAT:optional] 문자 내역 조회 용
});

const SueopKonSchema = z.object({
  nanoId: z.string(),
  name: z.string(),
  konCategory: KonCategorySchema,
  gibonBoonAmount: z.number().nullable(), // 콘의 기본 분 수강료, 없으면 null
  gibonBoonNanoId: z.string(),
});

const SueopBoonSchema = z.object({
  nanoId: z.string(),
  name: z.string(), // [COMPAT:derived] from CSV date column header (e.g. "07 토")
  amount: z.number().nullable(), // [COMPAT:user-input] 수업 분별 수강료
  boonbanSugangsaengGroupName: z.string().nullable().optional(), // [COMPAT:optional]
  boonbanSugangsaengGroupNanoId: z.string().nullable().optional(), // [COMPAT:optional]
});

const SueopSchema = z.object({
  nanoId: z.string(),
  name: z.string(), // [COMPAT:derived] from CSV header row
  amount: z.number().nullable(), // [COMPAT:user-input] 수업 회차당 수강료
  kons: z.array(SueopKonSchema), // [COMPAT:derived+user-input] hoecha kon auto-created, chuga-cheonggu from user
  boons: z.array(SueopBoonSchema), // [COMPAT:derived] from CSV date columns
});

const QueryPeriodSchema = z.object({
  startAt: z.string(), // 조회 기간 시작 (e.g. "2025-05-01") [COMPAT:derived] from CSV month
  endAt: z.string(), // 조회 기간 끝 (e.g. "2025-05-31") [COMPAT:derived] from CSV month
});

export const SueopAggregateInputSchema = z.object({
  queryPeriod: QueryPeriodSchema,
  sugangsaengs: z.array(SugangsaengSchema),
  sueop: SueopSchema,
});

export type SueopAggregateInput = z.infer<typeof SueopAggregateInputSchema>;

export type Sugangsaeng = z.infer<typeof SugangsaengSchema>;
export type ConnectedKon = z.infer<typeof ConnectedKonSchema>;
export type ConnectedBoon = z.infer<typeof ConnectedBoonSchema>;
export type ConnectedChulseokWorkBranch = z.infer<typeof ConnectedChulseokWorkBranchSchema>;
export type HVector = z.infer<typeof HVectorSchema>;
export type ConnectedSueomnyo = z.infer<typeof ConnectedSueomnyoSchema>;
export type BubunCheonggu = z.infer<typeof BubunCheongguSchema>;
export type Sunap = z.infer<typeof SunapSchema>;
export type Allim = z.infer<typeof AllimSchema>;
export type SugangNaeyeok = z.infer<typeof SugangNaeyeokSchema>;
export type SueopKon = z.infer<typeof SueopKonSchema>;
export type SueopBoon = z.infer<typeof SueopBoonSchema>;
export type Sueop = z.infer<typeof SueopSchema>;
export type QueryPeriod = z.infer<typeof QueryPeriodSchema>;
export type KonCategory = z.infer<typeof KonCategorySchema>;
export type HVectorCategory = z.infer<typeof HVectorCategorySchema>;

// ─── Sueomnyo Scope Category ────────────────────────────────────────────────
// Classifies each sueomnyo relative to the queryPeriod.

export type SueomnyoScopeCategory =
  | 'in-scope'       // cheongguAt falls within queryPeriod — primary settlement data
  | 'related'        // cheongguAt is outside queryPeriod, but nabip activity occurred within queryPeriod
  | 'out-of-scope';  // neither cheongguAt nor nabip activity falls within queryPeriod

// ═══════════════════════════════════════════════════════════════════════════════
// Output Types — drives the UI
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Per-boon attendance cell (one column in the spreadsheet) ────────────────

export type AttendanceCell = {
  boonNanoId: string;
  boonName: string;
  date: string | null; // boonIljeong.startAt, null if iljeong missing
  hwaginCategory: HVectorCategory | null; // null if no chulseok work exists for this boon
  yejeongCategory: HVectorCategory | null;
  hasSueomnyo: boolean;
  sueomnyoNanoId: string | null;
  bigo: string | null; // hVector bigo
  highlight: CellHighlight | null;
};

// ─── Sueomnyo timing detail (for settlement analysis) ───────────────────────

export type SueomnyoTimingDetail = {
  cheongguNanoId: string;
  cheongguName: string;
  boonNanoId: string | null;
  konCategory: KonCategory | null;
  scopeCategory: SueomnyoScopeCategory; // in-scope / related / out-of-scope relative to queryPeriod
  cheongguCreatedAt: string | null; // when the sueomnyo was created (user action) — null in compat mode
  cheongguAt: string | null; // the supposed payment deadline
  nabipTimestamp: string | null; // best guess from updatedAt / sunap.createdAt / sunapLatestBubunGyeoljeUpdateAt
  totalActualAmount: number;
  totalNabipAmount: number;
  totalMinapAmount: number;
  totalHarinAmount: number;
  hasConcern: boolean;
};

// ─── Amount Breakdown (explains WHY a student's amount is what it is) ───────

export type AmountBreakdownLine = {
  label: string; // e.g. "회차 수강료", "교재비", "할인", "전월 동영상 3회"
  konCategory: KonCategory | null;
  unitAmount: number; // per-unit amount (e.g. 80,000)
  count: number; // how many (e.g. 4)
  subtotal: number; // unitAmount × count
  isGuessed: boolean; // true if this line was inferred, not from explicit data
};

export type AmountBreakdown = {
  lines: AmountBreakdownLine[];
  calculatedTotal: number; // sum of all lines
  actualTotal: number; // nabip + minap from data
  delta: number; // actualTotal - calculatedTotal (0 = perfect match)
  isFullyExplained: boolean; // delta === 0
  explanation: string; // human-readable summary, e.g. "80,000 × 4회 + 교재비 20,000 = 340,000"
};

// ─── Enrollment Context (when did this student enter/leave) ─────────────────

export type EnrollmentContext = {
  ipbanAt: string | null; // earliest ipban date from sugangNaeyeoks
  toebanAt: string | null; // latest toeban date (null if still active)
  enteredDuringPeriod: boolean; // ipbanAt falls within queryPeriod
  leftDuringPeriod: boolean; // toebanAt falls within queryPeriod
  hasPriorMonthActivity: boolean; // has sueomnyos or chulseok from before queryPeriod
};

// ─── Per-sugangsaeng analysis row (one row in the spreadsheet) ──────────────

export type SugangsaengAnalysisRow = {
  sugangsaengNanoId: string;
  sugangsaengName: string;
  isHwalseong: boolean;
  boonbanGroupName: string | null;

  attendanceCells: AttendanceCell[];

  harinRate: number; // total harin / total cheonggu as percentage (0~100)
  harinAmount: number;
  harinHighlight: CellHighlight | null;

  connectionStatus: 'normal' | 'warning' | 'error';
  statusHighlight: CellHighlight | null;

  billableAttendanceCount: number; // chulseok-site + chulseok-online + jigak + other-boonban
  totalAttendanceCount: number; // all categories including absent/mihwagin

  // ── Amount breakdown (explains the composition of this student's total) ──
  amountBreakdown: AmountBreakdown;

  // ── Enrollment context (when entered/left, prior month activity) ──
  enrollmentContext: EnrollmentContext;

  // ── In-scope amounts (cheongguAt within queryPeriod) ──
  inScope: {
    nabipAmount: number;
    minapAmount: number;
    harinAmount: number;
    sueomnyoCount: number;
  };

  // ── Related amounts (cheongguAt outside queryPeriod, but nabip activity within queryPeriod) ──
  related: {
    nabipAmount: number;
    minapAmount: number;
    harinAmount: number;
    sueomnyoCount: number;
  };

  nabipAmount: number; // inScope.nabipAmount (primary display value)
  nabipHighlight: CellHighlight | null;

  minapAmount: number; // inScope.minapAmount (primary display value)

  gyesanAmount: number; // calculated expected: billable count × rate + chuga-cheonggu
  chayi: number; // nabipAmount - gyesanAmount (in-scope only)
  chayiHighlight: CellHighlight | null;

  hasRelatedAmounts: boolean; // true if related amounts exist — UI should show indicator

  sueomnyoTimingDetails: SueomnyoTimingDetail[];

  findings: ValidationFinding[];
};

// ─── Sueop-level summary ────────────────────────────────────────────────────

export type SueopSummary = {
  sueopNanoId: string;
  sueopName: string;
  queryPeriod: QueryPeriod;
  totalSugangsaengCount: number;
  activeSugangsaengCount: number;
  totalBillableAttendanceCount: number;
  expectedTotalAmount: number;
  inScope: {
    nabipTotal: number;
    minapTotal: number;
    harinTotal: number;
  };
  related: {
    nabipTotal: number;
    minapTotal: number;
    harinTotal: number;
    sugangsaengCount: number; // how many sugangsaengs have related amounts
  };
  totalChayi: number; // inScope only
};

// ─── Final Report ───────────────────────────────────────────────────────────

export type SueopAggregateReport = ValidationReport & {
  analysisRows: SugangsaengAnalysisRow[];
  sueopSummary: SueopSummary;
  globalFindings: ValidationFinding[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// Derived Data (intermediate state during validation)
// ═══════════════════════════════════════════════════════════════════════════════

export type SueopAggregateDerived = {
  sueopBoonMap: Map<string, SueopBoon>;
  sueopKonMap: Map<string, SueopKon>;
};

export const INITIAL_DERIVED: SueopAggregateDerived = {
  sueopBoonMap: new Map(),
  sueopKonMap: new Map(),
};

// ─── Constants ──────────────────────────────────────────────────────────────

export const BILLABLE_CATEGORIES: HVectorCategory[] = [
  'chulseok-site',
  'chulseok-online',
  'jigak',
  'bogang',
  'other-boonban',
];
