export type StudentEntry = {
  id: string;
  studentName: string;
  carryOverMonth: number | null;
  attendanceCount: number;
  attendanceLabel: string;
  paidAmount: number;
  unpaidAmount: number;
  paymentMethod: string;
  payAmount: number;
  payOverridden: boolean;
  note: string;
  isCarryOver: boolean;
  needsReview: boolean;
};

export type CourseBlock = {
  id: string;
  teacherName: string;
  courseNameRaw: string;
  titleText: string;
  sessionCount: number;
  sessionDates: string[];
  sessionFee: number;
  sourceSheetName: string;
  carryOverCount: number;
  needsReview: boolean;
  notes: string[];
  students: StudentEntry[];
};

export type SettlementMonth = {
  campusName: string;
  year: number;
  month: number;
  feeRate: number;
  templateSheetName: string;
  templateWorkbookName: string;
  courses: CourseBlock[];
};

export type PreviousSettlementMeta = {
  campusName: string;
  year: number;
  month: number;
  feeRate: number;
  courses: Array<{
    id: string;
    titleText: string;
    teacherName: string;
    courseNameRaw: string;
    students: StudentEntry[];
  }>;
};

export type PreviousSettlementSource = {
  meta: PreviousSettlementMeta | null;
  carryOverCourses: PreviousSettlementMeta['courses'];
  campusName: string | null;
  year: number | null;
  month: number | null;
};
