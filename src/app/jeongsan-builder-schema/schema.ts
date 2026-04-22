export type Money = number;

export type PayDocumentSheetKind = "sueop_minap" | "bochungbi";

export type PayDocumentBlockKind = "sueop" | "minap_hoesu" | "bochungbi";

export type PayDocumentRowKind = "sueop_student" | "bochungbi_student" | "minap_hoesu_student";

export type FieldSourceKind = "excel" | "computed" | "user";

export type ReviewSeverity = "info" | "warning" | "blocking";

export type TeacherSettlementStatus =
  | "not_started"
  | "in_progress"
  | "needs_review"
  | "completed"
  | "sent";

export type SettlementCourseSourceKind =
  | "class_card"
  | "pay_document_sueop"
  | "pay_document_minap_hoesu"
  | "pay_document_bochungbi"
  | "manual";

export type SettlementLineItemKind = "sueop" | "bochungbi" | "manual_addition" | "manual_deduction";

export type SettlementBaseMetric =
  | "nabip_total"
  | "minap_total"
  | "hoesu_total"
  | "nabip_plus_hoesu_total"
  | "pay_total"
  | "silgang_count"
  | "kon_count"
  | "sugangsaeng_count"
  | "manual_amount";

export type SettlementFormulaKind = "rate" | "fixed" | "multiply" | "add" | "custom";

export type TaxPolicyKind = "withholding_3_3" | "tax_free" | "custom_rate";

export type SourceCellRef = {
  sheetName: string;
  rowIndex: number;
  columnIndex: number;
  address: string;
};

export type FieldTrace<T> = {
  value: T;
  source: FieldSourceKind;
  sourceLabel?: string;
  cell?: SourceCellRef;
};

export type PayDocumentRowBase = {
  id: string;
  rowKind: PayDocumentRowKind;
  rowNumber: number;
  sugangsaengName: FieldTrace<string>;
};

export type PayDocumentSueopStudentRow = PayDocumentRowBase & {
  rowKind: "sueop_student";
  silgangCountLabel: FieldTrace<string>;
  silgangCountValue: number | null;
  harinAmount: FieldTrace<Money>;
  nabipAmount: FieldTrace<Money>;
  minapAmount: FieldTrace<Money>;
  gyeoljeSudan: FieldTrace<string>;
  payAmount: FieldTrace<Money>;
  note?: string;
};

export type PayDocumentBochungbiStudentRow = PayDocumentRowBase & {
  rowKind: "bochungbi_student";
  konCountLabel: FieldTrace<string>;
  konCountValue: number | null;
  harinAmount: FieldTrace<Money>;
  nabipAmount: FieldTrace<Money>;
  minapAmount: FieldTrace<Money>;
  gyeoljeSudan: FieldTrace<string>;
  payAmount: FieldTrace<Money>;
  note?: string;
};

export type PayDocumentMinapHoesuRow = PayDocumentRowBase & {
  rowKind: "minap_hoesu_student";
  linkedSueopName: FieldTrace<string>;
  hoesuAmount: FieldTrace<Money>;
  minapAmount: FieldTrace<Money>;
  payAmount: FieldTrace<Money>;
  note?: string;
};

export type PayDocumentRow =
  | PayDocumentSueopStudentRow
  | PayDocumentBochungbiStudentRow
  | PayDocumentMinapHoesuRow;

export type PayDocumentBlockTotals = {
  quantityTotal: number;
  harinTotal: Money;
  nabipTotal: Money;
  minapTotal: Money;
  hoesuTotal: Money;
  payTotal: Money;
};

export type PayDocumentBlock = {
  id: string;
  kind: PayDocumentBlockKind;
  sheetName: string;
  sheetKind: PayDocumentSheetKind;
  jojikName: FieldTrace<string>;
  teacherName: FieldTrace<string>;
  monthLabel: string;
  titleText: FieldTrace<string>;
  sueopName: string;
  boonbanName: string | null;
  scheduleText: string | null;
  statusText: string | null;
  unitPriceText: string | null;
  rows: PayDocumentRow[];
  totals: PayDocumentBlockTotals;
};

export type PayDocumentParseResult = {
  sourceFileName: string;
  year: number;
  month: number;
  sheets: Array<{
    name: string;
    kind: PayDocumentSheetKind;
    blocks: PayDocumentBlock[];
    totals: PayDocumentBlockTotals;
  }>;
};

export type ClassCardRef = {
  classId: string;
  className: string;
  boonbanName: string | null;
  teacherName: string | null;
  sourceLabel: string;
};

export type PayDocumentBlockRef = {
  blockId: string;
  kind: PayDocumentBlockKind;
  sheetName: string;
  titleText: string;
  boonbanName: string | null;
};

export type CourseReceivableSummary = {
  nabipTotal: Money;
  minapTotal: Money;
  hoesuTotal: Money;
  nabipPlusHoesuTotal: Money;
  payTotal: Money;
};

export type SettlementReviewIssue = {
  id: string;
  severity: ReviewSeverity;
  code: string;
  message: string;
  targetType: "course" | "line_item" | "teacher" | "student_row";
  targetId: string;
  resolved: boolean;
};

export type SettlementCourse = {
  id: string;
  displayName: string;
  sourceKinds: SettlementCourseSourceKind[];
  classCardRef: ClassCardRef | null;
  payDocumentRefs: PayDocumentBlockRef[];
  teacherName: string;
  subjectName: string | null;
  scheduleText: string | null;
  boonbans: Array<{
    name: string;
    blockIds: string[];
  }>;
  receivableSummary: CourseReceivableSummary;
  missingClassCard: boolean;
  needsReview: boolean;
  reviewIssueIds: string[];
};

export type SettlementFormula = {
  baseMetric: SettlementBaseMetric;
  formulaKind: SettlementFormulaKind;
  value: number;
  customBaseAmount: Money | null;
  expressionLabel: string;
};

export type SettlementTaxPolicy = {
  kind: TaxPolicyKind;
  rate: number;
  taxable: boolean;
};

export type SettlementLineItem = {
  id: string;
  kind: SettlementLineItemKind;
  sign: 1 | -1;
  title: string;
  courseId: string | null;
  sourceBlockIds: string[];
  formula: SettlementFormula;
  taxPolicy: SettlementTaxPolicy;
  amount: Money;
  note: string;
  source: FieldSourceKind;
  needsReview: boolean;
};

export type TeacherSettlementSummary = {
  grossPositiveAmount: Money;
  grossDeductionAmount: Money;
  settlementAmountBeforeTax: Money;
  taxableAmount: Money;
  withholdingTaxAmount: Money;
  finalPayoutAmount: Money;
};

export type TeacherSettlementDraft = {
  id: string;
  teacherName: string;
  subjectName: string | null;
  status: TeacherSettlementStatus;
  completion: {
    completedAt: string | null;
    completedBy: string | null;
    sentAt: string | null;
  };
  courses: SettlementCourse[];
  lineItems: SettlementLineItem[];
  issues: SettlementReviewIssue[];
  taxPolicy: SettlementTaxPolicy;
  summary: TeacherSettlementSummary;
};

export type SettlementBuilderSchemaSnapshot = {
  schemaVersion: "2026-04-draft-1";
  source: {
    payDocumentFileName: string;
    memoSources: string[];
  };
  parseResult: PayDocumentParseResult;
  teacherSettlements: TeacherSettlementDraft[];
};
