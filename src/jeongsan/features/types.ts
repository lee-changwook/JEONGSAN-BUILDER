export type SheetKind = "revenue" | "material" | "arrears";

export type SettlementWarningCategory = "sheet" | "match" | "formula" | "calc";

export type SettlementWarning = {
  id: string;
  category: SettlementWarningCategory;
  message: string;
  teacherId?: string;
  courseId?: string;
};

export type SourceRef = {
  workbookName: string;
  sheetName: string;
  blockTitle: string;
  rowNumber: number;
};

export type NumericCell = {
  raw: string;
  value: number;
};

export type ParsedPayRow = {
  id: string;
  source: SourceRef;
  name: string;
  nameMonthTag: number | null;
  attendance: NumericCell;
  paid: NumericCell;
  unpaid: NumericCell;
  paymentMethod: string;
  pay: NumericCell;
  memo: string;
  needsReview: boolean;
};

/** 페이문서 시트 직사각형 블록 직렬화 — 내보내기 시 「강좌별 세부내역」에 그대로 붙임 */
export type PayBlockSnapshotMerge = {
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type PayBlockSnapshotCell = {
  value: unknown;
  numFmt: string;
  style: unknown;
  alignment: unknown;
  border: unknown;
  fill: unknown;
  font: unknown;
  protection: unknown;
};

export type PayBlockSnapshot = {
  version: number;
  rowCount: number;
  colCount: number;
  columnWidths: (number | undefined)[];
  cells: PayBlockSnapshotCell[][];
  merges: PayBlockSnapshotMerge[];
  /** settlement `copyRowRange` / `cloneWorksheetShell`에 맞춘 행·열 메타 */
  rowHeights?: (number | undefined)[];
  columnStyles?: unknown[];
  columnHidden?: boolean[];
  defaultRowHeight?: number;
  /** 원본 시트에서 이 직사각형의 좌상단(1-based). 내보내기 시 가로로 나란히 붙일 때 사용 */
  sourceAbsoluteRowStart?: number;
  sourceAbsoluteColStart?: number;
};

export type ParsedCourseBlock = {
  id: string;
  sourceWorkbook: string;
  sourceSheet: string;
  sheetKind: SheetKind;
  teacherName: string;
  teacherKey: string;
  courseTitle: string;
  courseName: string;
  courseKey: string;
  scheduleText: string;
  rows: ParsedPayRow[];
  detailSnapshot: PayBlockSnapshot | null;
};

export type ParsedPayDocument = {
  workbookName: string;
  year: number;
  month: number;
  blocks: ParsedCourseBlock[];
};

export type PreviousPayoutRow = {
  teacherName: string;
  teacherKey: string;
  courseName: string;
  courseKey: string;
  ratio: number | null;
  hours: number | null;
  note: string;
};

export type PreviousPayoutData = {
  sourceName: string;
  rows: PreviousPayoutRow[];
};

export type StudentSettlementRow = {
  id: string;
  source: SourceRef;
  studentName: string;
  studentNameRaw: string;
  monthTag: number | null;
  attendanceCount: number;
  attendanceRaw: string;
  paidAmount: number;
  paidAmountRaw: string;
  unpaidAmount: number;
  unpaidAmountRaw: string;
  paymentMethod: string;
  payAmount: number;
  payAmountRaw: string;
  note: string;
  needsReview: boolean;
};

export type CourseSettlement = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherKey: string;
  sheetKind: SheetKind;
  sourceWorkbook: string;
  sourceSheet: string;
  titleText: string;
  courseName: string;
  courseKey: string;
  scheduleText: string;
  rows: StudentSettlementRow[];
  detailSnapshot: PayBlockSnapshot | null;
};

export type PayoutRow = {
  id: string;
  courseId: string;
  courseName: string;
  courseKey: string;
  sheetKind: SheetKind;
  scheduleText: string;
  previousOutstandingAmount: number;
  previousPaidAmount: number;
  currentPaidAmount: number;
  currentUnpaidAmount: number;
  totalSalesAmount: number;
  ratio: number | null;
  hours: number | null;
  payoutAmount: number;
  note: string;
  inherited: boolean;
  inheritedFromPrevious: boolean;
  needsReview: boolean;
};

export type AssistantPayrollRow = {
  id: string;
  teacherId: string;
  name: string;
  residentId: string;
  bankName: string;
  accountNumber: string;
  grossPay: number;
  taxRate: number;
  taxAmount: number;
  netPay: number;
};

export type TeacherSummary = {
  totalSalesAmount: number;
  totalPayoutAmount: number;
  totalAssistantGrossPay: number;
  teacherTaxRate: number;
  teacherTaxAmount: number;
  finalTeacherPay: number;
};

/** 강좌 매출과 무관한 고정 지급(진단고사, 기타 수당 등) — 급여대장에서 진단고사 행처럼 별도 줄로 표시 */
export type ExtraPayoutLine = {
  id: string;
  title: string;
  scheduleText: string;
  ratio: number | null;
  hours: number | null;
  amount: number;
  note: string;
};

export type TeacherSettlement = {
  id: string;
  teacherName: string;
  teacherKey: string;
  subjectName: string;
  /** 급여내역 시트 1행 제목(예: 고등1관) — 샘플: "고등1관 2월 결산자료(2025년)" */
  campusLabel: string;
  courses: CourseSettlement[];
  payoutRows: PayoutRow[];
  /** 수업·강좌 외 지급 줄 */
  extraPayoutLines: ExtraPayoutLine[];
  assistants: AssistantPayrollRow[];
  note: string;
  summary: TeacherSummary;
};

export type TeacherSettlementMonth = {
  year: number;
  month: number;
  uploadedDocumentNames: string[];
  previousPayoutFileName: string | null;
  teachers: TeacherSettlement[];
  warnings: SettlementWarning[];
};

export type ParseTeacherSettlementResponse = {
  settlement: TeacherSettlementMonth;
  warnings: SettlementWarning[];
};
