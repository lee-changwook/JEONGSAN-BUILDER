import type { FindingSeverity, CellHighlight, ValidationFinding } from '@/aca/domain/sueop/validator';
export type { FindingSeverity, CellHighlight, ValidationFinding };

export type DataSource = 'tikita' | 'aca2000';

export type ValidatorStep = 1 | 2;

export type FindingStatus = 'pending' | 'resolved' | 'on-hold';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'dongYoung' | 'bogang' | 'hyuGang';

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface CourseInfo {
  id: string;
  name: string;
  teacher: string;
  studentCount: number;
  dayOfWeek: string;
  time: string;
  isClinic?: boolean;
}

export interface StudentRow {
  name: string;
  school: string;
  attendance: Record<string, AttendanceStatus>;
  discount: number;
  unpaidAmount: number;
  status: 'active' | 'jeonban' | 'toewon';
  nabipAmount: number;
  computedAmount: number;
}

export interface CourseRule {
  schedule: string;
  unitPrice: number;
  totalHoesu: number;
  gyojaeBi: number;
  queryPeriodStart: string;
  queryPeriodEnd: string;
  hoechaSchedule: string[];
}

export interface CourseData {
  course: CourseInfo;
  students: StudentRow[];
  rule: CourseRule;
}

export interface AnalysisRow {
  studentName: string;
  school: string;
  status: 'active' | 'jeonban' | 'toewon';
  attendanceCells: Record<string, { value: AttendanceStatus; highlight: CellHighlight | null }>;
  billableCount: number;
  discount: number;
  unpaidAmount: number;
  gyesanAmount: number;
  nabipAmount: number;
  chayi: number;
  unpaidHighlight: CellHighlight | null;
  chayiHighlight: CellHighlight | null;
  statusHighlight: CellHighlight | null;
}

export interface CourseSummary {
  totalStudents: number;
  activeStudents: number;
  totalGyesan: number;
  totalNabip: number;
  totalChayi: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface CourseReport {
  courseId: string;
  courseName: string;
  rows: AnalysisRow[];
  summary: CourseSummary;
  findings: Array<{
    id: string;
    severity: FindingSeverity;
    category: string;
    message: string;
    reason: string;
    evidence: Record<string, string | number>;
    suggestion: string;
  }>;
}
