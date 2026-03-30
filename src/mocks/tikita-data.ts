import type { CourseData, CourseInfo, StudentRow, CourseRule, AttendanceStatus } from '@/features/validator/types';
import { makeDates, studentPool } from './shared-data';

const courses: CourseInfo[] = [
  { id: 'c-001', name: '고2 수학 심화반', teacher: '김명훈', studentCount: 8, dayOfWeek: '월수', time: '16:00~18:00' },
  { id: 'c-002', name: '중3 영어 독해반', teacher: '박서연', studentCount: 7, dayOfWeek: '화목', time: '17:00~19:00' },
  { id: 'c-003', name: '고1 국어 문법반', teacher: '이지현', studentCount: 6, dayOfWeek: '월수금', time: '14:00~16:00' },
  { id: 'c-004', name: '중2 수학 기본반', teacher: '최재원', studentCount: 8, dayOfWeek: '화목', time: '15:00~17:00' },
  { id: 'c-005', name: '고3 수학 파이널', teacher: '김명훈', studentCount: 10, dayOfWeek: '수토', time: '10:00~12:30' },
  { id: 'c-006', name: '중1 영어 기초반', teacher: '박서연', studentCount: 6, dayOfWeek: '월수', time: '14:00~16:00' },
  { id: 'c-007', name: '고2 물리 클리닉', teacher: '윤서진', studentCount: 7, dayOfWeek: '화목', time: '18:00~20:00', isClinic: true },
  { id: 'c-008', name: '고1 화학 기본반', teacher: '서예린', studentCount: 5, dayOfWeek: '월수', time: '18:00~20:00' },
];

const rules: Record<string, CourseRule> = {
  'c-001': { schedule: '월수 16:00~18:00', unitPrice: 50000, totalHoesu: 8, gyojaeBi: 30000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'c-002': { schedule: '화목 17:00~19:00', unitPrice: 45000, totalHoesu: 8, gyojaeBi: 25000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'c-003': { schedule: '월수금 14:00~16:00', unitPrice: 30000, totalHoesu: 12, gyojaeBi: 20000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'c-004': { schedule: '화목 15:00~17:00', unitPrice: 40000, totalHoesu: 8, gyojaeBi: 20000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'c-005': { schedule: '수토 10:00~12:30', unitPrice: 60000, totalHoesu: 8, gyojaeBi: 40000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'c-006': { schedule: '월수 14:00~16:00', unitPrice: 35000, totalHoesu: 8, gyojaeBi: 15000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'c-007': { schedule: '화목 18:00~20:00', unitPrice: 48000, totalHoesu: 8, gyojaeBi: 30000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
  'c-008': { schedule: '월수 18:00~20:00', unitPrice: 45000, totalHoesu: 8, gyojaeBi: 25000, queryPeriodStart: '2026-03-01', queryPeriodEnd: '2026-03-31', hoechaSchedule: [] },
};

function makeAttendance(dates: string[], seed: number): Record<string, AttendanceStatus> {
  const result: Record<string, AttendanceStatus> = {};
  dates.forEach((date, i) => {
    const v = (seed * 7 + i * 13) % 20;
    if (v === 0) result[date] = 'absent';
    else if (v === 1) result[date] = 'late';
    else if (v === 2) result[date] = 'bogang';
    else result[date] = 'present';
  });
  return result;
}

const statusOptions: StudentRow['status'][] = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'jeonban', 'active'];

function buildStudents(courseId: string, count: number, startIdx: number): StudentRow[] {
  const rule = rules[courseId];
  const course = courses.find((c) => c.id === courseId)!;
  const dates = makeDates(course.dayOfWeek);

  return Array.from({ length: count }, (_, i) => {
    const pool = studentPool[startIdx + i];
    const status = statusOptions[(startIdx + i) % statusOptions.length];
    const attendance = makeAttendance(dates, startIdx + i);
    const presentCount = Object.values(attendance).filter((s) => s === 'present' || s === 'late' || s === 'bogang').length;
    const discount = (startIdx + i) % 7 === 0 ? 0.1 : 0;
    const computed = Math.round(rule.unitPrice * presentCount * (1 - discount) + rule.gyojaeBi);

    const fullAmount = Math.round((rule.unitPrice * rule.totalHoesu + rule.gyojaeBi) * (1 - discount));
    const variant = (startIdx + i) % 7;
    const nabipVariant = variant === 0
      ? fullAmount - 30000
      : variant === 2 ? fullAmount - 50000
      : variant === 4 ? fullAmount - 20000
        : fullAmount;

    return {
      name: pool.name,
      school: pool.school,
      attendance,
      discount,
      unpaidAmount: 0,
      status,
      nabipAmount: nabipVariant,
      computedAmount: computed,
    };
  });
}

const courseDataMap: Record<string, CourseData> = {
  'c-001': { course: courses[0], students: buildStudents('c-001', 8, 0), rule: rules['c-001'] },
  'c-002': { course: courses[1], students: buildStudents('c-002', 7, 8), rule: rules['c-002'] },
  'c-003': { course: courses[2], students: buildStudents('c-003', 6, 15), rule: rules['c-003'] },
  'c-004': { course: courses[3], students: buildStudents('c-004', 8, 21), rule: rules['c-004'] },
  'c-005': { course: courses[4], students: buildStudents('c-005', 10, 29), rule: rules['c-005'] },
  'c-006': { course: courses[5], students: buildStudents('c-006', 6, 39), rule: rules['c-006'] },
  'c-007': { course: courses[6], students: buildStudents('c-007', 7, 45), rule: rules['c-007'] },
  'c-008': { course: courses[7], students: buildStudents('c-008', 5, 52), rule: rules['c-008'] },
};

export { courses as tikitaCourses };

export function loadTikitaData(gangjwaIds: string[]): CourseData[] {
  return gangjwaIds.map((id) => courseDataMap[id]).filter(Boolean);
}
