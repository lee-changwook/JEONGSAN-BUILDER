import type { CourseData, CourseInfo, StudentRow, CourseRule, AttendanceStatus } from '@/features/validator/types';
import { makeDates, studentPool } from './shared-data';

const acaCourses: CourseInfo[] = [
  { id: 'ac-001', name: '고2 수학 심화반', teacher: '김명훈', studentCount: 8, dayOfWeek: '월수', time: '16:00~18:00' },
  { id: 'ac-002', name: '중3 영어 독해반', teacher: '박서연', studentCount: 7, dayOfWeek: '화목', time: '17:00~19:00' },
  { id: 'ac-003', name: '고1 국어 문법반', teacher: '이지현', studentCount: 6, dayOfWeek: '월수금', time: '14:00~16:00' },
  { id: 'ac-004', name: '중2 수학 기본반', teacher: '최재원', studentCount: 8, dayOfWeek: '화목', time: '15:00~17:00' },
  { id: 'ac-005', name: '고3 수학 파이널', teacher: '김명훈', studentCount: 9, dayOfWeek: '수토', time: '10:00~12:30' },
  { id: 'ac-006', name: '중1 영어 기초반', teacher: '박서연', studentCount: 6, dayOfWeek: '월수', time: '14:00~16:00' },
  { id: 'ac-007', name: '고2 물리 클리닉', teacher: '윤서진', studentCount: 7, dayOfWeek: '화목', time: '18:00~20:00', isClinic: true },
  { id: 'ac-008', name: '고1 화학 기본반', teacher: '서예린', studentCount: 5, dayOfWeek: '월수', time: '18:00~20:00' },
];

const acaRules: Record<string, CourseRule> = {
  'ac-001': { schedule: '월수 16:00~18:00', unitPrice: 50000, totalHoesu: 8, gyojaeBi: 30000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'ac-002': { schedule: '화목 17:00~19:00', unitPrice: 45000, totalHoesu: 8, gyojaeBi: 25000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'ac-003': { schedule: '월수금 14:00~16:00', unitPrice: 30000, totalHoesu: 12, gyojaeBi: 20000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'ac-004': { schedule: '화목 15:00~17:00', unitPrice: 40000, totalHoesu: 8, gyojaeBi: 20000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'ac-005': { schedule: '수토 10:00~12:30', unitPrice: 60000, totalHoesu: 8, gyojaeBi: 40000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'ac-006': { schedule: '월수 14:00~16:00', unitPrice: 35000, totalHoesu: 8, gyojaeBi: 15000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'ac-007': { schedule: '화목 18:00~20:00', unitPrice: 48000, totalHoesu: 8, gyojaeBi: 30000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'ac-008': { schedule: '월수 18:00~20:00', unitPrice: 45000, totalHoesu: 8, gyojaeBi: 25000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
};

function makeAcaAttendance(dates: string[], seed: number): Record<string, AttendanceStatus> {
  const result: Record<string, AttendanceStatus> = {};
  dates.forEach((date, i) => {
    const v = (seed * 11 + i * 17) % 25;
    if (v === 0) result[date] = 'absent';
    else if (v === 1) result[date] = 'late';
    else if (v === 2) result[date] = 'dongYoung';
    else result[date] = 'present';
  });
  return result;
}

function buildAcaStudents(courseId: string, count: number, startIdx: number): StudentRow[] {
  const rule = acaRules[courseId];
  const course = acaCourses.find((c) => c.id === courseId)!;
  const dates = makeDates(course.dayOfWeek);

  return Array.from({ length: count }, (_, i) => {
    const pool = studentPool[startIdx + i];
    const statusList: StudentRow['status'][] = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'toewon', 'active'];
    const status = statusList[(startIdx + i) % statusList.length];
    const attendance = makeAcaAttendance(dates, startIdx + i);
    const presentCount = Object.values(attendance).filter((s) => s === 'present' || s === 'late' || s === 'bogang').length;
    const computed = Math.round(rule.unitPrice * presentCount + rule.gyojaeBi);

    const fullAmount = rule.unitPrice * rule.totalHoesu + rule.gyojaeBi;
    const variant = (startIdx + i) % 7;
    const nabip = variant === 0 ? fullAmount - 30000
      : variant === 2 ? fullAmount - 50000
      : variant === 4 ? fullAmount - 20000
        : fullAmount;
    const unpaid = fullAmount - nabip;

    return {
      name: pool.name,
      school: pool.school,
      attendance,
      discount: 0,
      unpaidAmount: unpaid,
      status,
      nabipAmount: nabip,
      computedAmount: computed,
    };
  });
}

const acaCourseDataMap: Record<string, CourseData> = {
  'ac-001': { course: acaCourses[0], students: buildAcaStudents('ac-001', 8, 0), rule: acaRules['ac-001'] },
  'ac-002': { course: acaCourses[1], students: buildAcaStudents('ac-002', 7, 8), rule: acaRules['ac-002'] },
  'ac-003': { course: acaCourses[2], students: buildAcaStudents('ac-003', 6, 15), rule: acaRules['ac-003'] },
  'ac-004': { course: acaCourses[3], students: buildAcaStudents('ac-004', 8, 21), rule: acaRules['ac-004'] },
  'ac-005': { course: acaCourses[4], students: buildAcaStudents('ac-005', 9, 29), rule: acaRules['ac-005'] },
  'ac-006': { course: acaCourses[5], students: buildAcaStudents('ac-006', 6, 38), rule: acaRules['ac-006'] },
  'ac-007': { course: acaCourses[6], students: buildAcaStudents('ac-007', 7, 44), rule: acaRules['ac-007'] },
  'ac-008': { course: acaCourses[7], students: buildAcaStudents('ac-008', 5, 51), rule: acaRules['ac-008'] },
};

export { acaCourses };

export function parseAcaExcel(): CourseData[] {
  return Object.values(acaCourseDataMap);
}
