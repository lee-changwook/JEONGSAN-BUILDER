import { create } from 'zustand';
import type {
  DataSource,
  ValidatorStep,
  CourseData,
  ValidationFinding,
  FindingStatus,
  CourseRule,
  StudentRow,
  AttendanceStatus,
} from '@/features/validator/types';
import { loadTikitaData } from '@/mocks/tikita-data';
import { parseAcaExcel } from '@/mocks/aca-data';
import { computeCourseReport } from '@/features/validator/logic/compute-report';
import { makeDates } from '@/mocks/shared-data';
import type { CourseReport } from '@/features/validator/types';

interface ValidatorState {
  currentStep: ValidatorStep;
  dataSource: DataSource;
  selectedMonth: string;
  selectedGangjwaIds: string[];
  loadedData: CourseData[];
  findings: ValidationFinding[];
  findingStatuses: Record<string, FindingStatus>;
  acaCourseRule: CourseRule | null;
  acaSpreadsheetData: Record<string, StudentRow[]>;
  queryPeriodStart: string;
  queryPeriodEnd: string;
  acaHoechaSchedule: string[];
  acaStudentDiscounts: { name: string; school: string; grade: string; parentPhone: string; rate: number; previousUnpaid: number }[];
  courseReports: CourseReport[];

  setStep: (step: ValidatorStep) => void;
  setDataSource: (source: DataSource) => void;
  selectGangjwa: (ids: string[]) => void;
  loadData: () => void;
  runValidation: () => void;
  setFindingStatus: (findingId: string, status: FindingStatus) => void;
  updateSpreadsheetCell: (courseId: string, studentIdx: number, field: keyof StudentRow, value: string | number) => void;
  updateAttendanceCell: (courseId: string, studentIdx: number, date: string, value: AttendanceStatus) => void;
  setQueryPeriod: (start: string, end: string) => void;
  setAcaHoechaSchedule: (dates: string[]) => void;
  setAcaStudentDiscounts: (discounts: { name: string; school: string; grade: string; parentPhone: string; rate: number; previousUnpaid: number }[]) => void;
  unlockSelection: () => void;
  resetSelection: () => void;
  resetAll: () => void;
}

const initialState = {
  currentStep: 1 as ValidatorStep,
  dataSource: 'tikita' as DataSource,
  selectedMonth: '2026-03',
  selectedGangjwaIds: [] as string[],
  loadedData: [] as CourseData[],
  findings: [] as ValidationFinding[],
  findingStatuses: {} as Record<string, FindingStatus>,
  acaCourseRule: null as CourseRule | null,
  acaSpreadsheetData: {} as Record<string, StudentRow[]>,
  queryPeriodStart: '2026-03-01',
  queryPeriodEnd: '2026-03-31',
  acaHoechaSchedule: [] as string[],
  acaStudentDiscounts: [] as { name: string; school: string; grade: string; parentPhone: string; rate: number; previousUnpaid: number }[],
  courseReports: [] as CourseReport[],
};

export const useValidatorStore = create<ValidatorState>()((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  setDataSource: (source) =>
    set({
      dataSource: source,
      selectedGangjwaIds: [],
      loadedData: [],
      findings: [],
      findingStatuses: {},
      acaSpreadsheetData: {},
      courseReports: [],
      queryPeriodStart: '2026-03-01',
      queryPeriodEnd: '2026-03-31',
      acaHoechaSchedule: [],
      acaStudentDiscounts: [],
    }),

  selectGangjwa: (ids) => set({ selectedGangjwaIds: ids }),

  loadData: () => {
    const { dataSource, selectedGangjwaIds } = get();
    if (dataSource === 'tikita') {
      const data = loadTikitaData(selectedGangjwaIds);
      set({ loadedData: data });
    } else {
      const data = parseAcaExcel();
      const spreadsheet: Record<string, StudentRow[]> = {};
      data.forEach((cd) => {
        spreadsheet[cd.course.id] = cd.students.map((s) => ({ ...s }));
      });
      set({ loadedData: data, acaSpreadsheetData: spreadsheet });
    }
  },

  runValidation: () => {
    const { loadedData } = get();
    const reports = loadedData.map((cd) => {
      const dates = makeDates(cd.course.dayOfWeek);
      return computeCourseReport(cd, dates);
    });

    const allFindings: ValidationFinding[] = reports.flatMap((r) =>
      r.findings.map((f) => ({
        ...f,
        gangjwaName: r.courseName,
        diff: { field: '', expected: 0, actual: 0 },
        status: 'pending' as FindingStatus,
      })),
    );

    const statuses: Record<string, FindingStatus> = {};
    allFindings.forEach((f) => {
      statuses[f.id] = 'pending';
    });

    set({ courseReports: reports, findings: allFindings, findingStatuses: statuses });
  },

  setFindingStatus: (findingId, status) =>
    set((state) => ({
      findingStatuses: { ...state.findingStatuses, [findingId]: status },
    })),

  updateSpreadsheetCell: (courseId, studentIdx, field, value) => {
    const state = get();
    const courseIdx = state.loadedData.findIndex((cd) => cd.course.id === courseId);
    if (courseIdx < 0) return;

    const course = state.loadedData[courseIdx];
    const updatedStudents = [...course.students];
    updatedStudents[studentIdx] = { ...updatedStudents[studentIdx], [field]: value };

    const updatedCourse = { ...course, students: updatedStudents };
    const updatedLoadedData = [...state.loadedData];
    updatedLoadedData[courseIdx] = updatedCourse;

    const dates = makeDates(updatedCourse.course.dayOfWeek);
    const newReport = computeCourseReport(updatedCourse, dates);
    const updatedReports = [...state.courseReports];
    const reportIdx = updatedReports.findIndex((r) => r.courseId === courseId);
    if (reportIdx >= 0) updatedReports[reportIdx] = newReport;

    const allFindings: ValidationFinding[] = updatedReports.flatMap((r) =>
      r.findings.map((f) => ({
        ...f,
        gangjwaName: r.courseName,
        diff: { field: '', expected: 0, actual: 0 },
        status: 'pending' as FindingStatus,
      })),
    );
    const statuses: Record<string, FindingStatus> = {};
    allFindings.forEach((f) => {
      statuses[f.id] = state.findingStatuses[f.id] ?? 'pending';
    });

    set({
      loadedData: updatedLoadedData,
      courseReports: updatedReports,
      findings: allFindings,
      findingStatuses: statuses,
    });
  },

  updateAttendanceCell: (courseId, studentIdx, date, value) => {
    const state = get();
    const courseIdx = state.loadedData.findIndex((cd) => cd.course.id === courseId);
    if (courseIdx < 0) return;

    const course = state.loadedData[courseIdx];
    const updatedStudents = [...course.students];
    updatedStudents[studentIdx] = {
      ...updatedStudents[studentIdx],
      attendance: { ...updatedStudents[studentIdx].attendance, [date]: value },
    };

    const updatedCourse = { ...course, students: updatedStudents };
    const updatedLoadedData = [...state.loadedData];
    updatedLoadedData[courseIdx] = updatedCourse;

    const dates = makeDates(updatedCourse.course.dayOfWeek);
    const newReport = computeCourseReport(updatedCourse, dates);
    const updatedReports = [...state.courseReports];
    const reportIdx = updatedReports.findIndex((r) => r.courseId === courseId);
    if (reportIdx >= 0) updatedReports[reportIdx] = newReport;

    const allFindings: ValidationFinding[] = updatedReports.flatMap((r) =>
      r.findings.map((f) => ({
        ...f,
        gangjwaName: r.courseName,
        diff: { field: '', expected: 0, actual: 0 },
        status: 'pending' as FindingStatus,
      })),
    );
    const statuses: Record<string, FindingStatus> = {};
    allFindings.forEach((f) => {
      statuses[f.id] = state.findingStatuses[f.id] ?? 'pending';
    });

    set({
      loadedData: updatedLoadedData,
      courseReports: updatedReports,
      findings: allFindings,
      findingStatuses: statuses,
    });
  },

  setQueryPeriod: (start, end) => set({ queryPeriodStart: start, queryPeriodEnd: end }),

  setAcaHoechaSchedule: (dates) => set({ acaHoechaSchedule: dates }),

  setAcaStudentDiscounts: (discounts) => set({ acaStudentDiscounts: discounts }),

  unlockSelection: () =>
    set({
      loadedData: [],
      findings: [],
      findingStatuses: {},
      acaSpreadsheetData: {},
      courseReports: [],
    }),

  resetSelection: () =>
    set({
      selectedGangjwaIds: [],
      loadedData: [],
      findings: [],
      findingStatuses: {},
      acaSpreadsheetData: {},
      courseReports: [],
    }),

  resetAll: () => set(initialState),
}));
