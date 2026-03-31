import { create } from 'zustand';
import type {
  DataSource,
  ValidatorStep,
  CourseData,
  CourseRule,
  FindingStatus,
  StudentRow,
  AttendanceStatus,
} from '@/features/validator/types';
import type {
  SueopAggregateReport,
  ValidationFinding,
} from '@/aca/domain/sueop/validator';
import { loadCourseData } from '@/features/validator/logic/load-data';
import { makeDates } from '@/mocks/shared-data';
import { buildSueopAggregateInput } from '@/features/validator/logic/build-input';
import {
  ValidatorStrategyMap,
  ValidatorIdEnum,
} from '@/aca/domain/sueop/validator';

// ─── Finding ID generation ──────────────────────────────────────────────────
// The reference validator's ValidationFinding has no `id` field.
// We generate stable IDs at the store layer for UI tracking (findingStatuses, React keys).

export type FindingWithId = ValidationFinding & { id: string };

function enrichFindingsWithIds(findings: ValidationFinding[]): FindingWithId[] {
  return findings.map((f, i) => ({
    ...f,
    id: `f-${String(i + 1).padStart(3, '0')}`,
  }));
}

function enrichReportWithIds(report: SueopAggregateReport): SueopAggregateReport & { findings: FindingWithId[] } {
  const enrichedFindings = enrichFindingsWithIds(report.findings);

  const enrichedRows = report.analysisRows.map((row) => ({
    ...row,
    findings: row.findings.map((rf) => {
      const idx = report.findings.indexOf(rf);
      return idx >= 0
        ? enrichedFindings[idx]
        : { ...rf, id: `f-row-${Math.random().toString(36).slice(2, 8)}` };
    }),
  }));

  return {
    ...report,
    findings: enrichedFindings,
    analysisRows: enrichedRows,
  };
}

interface ValidatorState {
  currentStep: ValidatorStep;
  dataSource: DataSource;
  selectedMonth: string;
  selectedGangjwaIds: string[];
  loadedData: CourseData[];
  findingStatuses: Record<string, FindingStatus>;
  acaCourseRule: CourseRule | null;
  acaSpreadsheetData: Record<string, StudentRow[]>;
  queryPeriodStart: string;
  queryPeriodEnd: string;
  acaHoechaSchedule: string[];
  acaStudentDiscounts: { name: string; school: string; grade: string; parentPhone: string; rate: number; previousUnpaid: number }[];
  report: SueopAggregateReport | null;

  setStep: (step: ValidatorStep) => void;
  setDataSource: (source: DataSource) => void;
  selectGangjwa: (ids: string[]) => void;
  loadData: () => void;
  runValidation: () => void;
  setFindingStatus: (findingId: string, status: FindingStatus) => void;
  updateAttendanceCell: (studentIdx: number, date: string, value: AttendanceStatus) => void;
  setQueryPeriod: (start: string, end: string) => void;
  setAcaHoechaSchedule: (dates: string[]) => void;
  setAcaStudentDiscounts: (discounts: ValidatorState['acaStudentDiscounts']) => void;
  setLoadedDataFromExcel: (data: CourseData[]) => void;
  updateCourseRule: (patch: Partial<CourseRule>) => void;
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
  findingStatuses: {} as Record<string, FindingStatus>,
  acaCourseRule: null as CourseRule | null,
  acaSpreadsheetData: {} as Record<string, StudentRow[]>,
  queryPeriodStart: '2026-03-01',
  queryPeriodEnd: '2026-03-31',
  acaHoechaSchedule: [] as string[],
  acaStudentDiscounts: [] as ValidatorState['acaStudentDiscounts'],
  report: null as SueopAggregateReport | null,
};

export const useValidatorStore = create<ValidatorState>()((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  setDataSource: (source) =>
    set({
      dataSource: source,
      selectedGangjwaIds: [],
      loadedData: [],
      findingStatuses: {},
      acaSpreadsheetData: {},
      report: null,
      queryPeriodStart: '2026-03-01',
      queryPeriodEnd: '2026-03-31',
      acaHoechaSchedule: [],
      acaStudentDiscounts: [],
    }),

  selectGangjwa: (ids) => set({ selectedGangjwaIds: ids }),

  loadData: () => {
    const { dataSource, selectedGangjwaIds } = get();
    const { loadedData, acaSpreadsheetData } = loadCourseData(dataSource, selectedGangjwaIds);
    set({ loadedData, acaSpreadsheetData });
  },

  runValidation: () => {
    const state = get();
    const { dataSource, loadedData, queryPeriodStart, queryPeriodEnd, acaHoechaSchedule, acaStudentDiscounts } = state;

    const firstCourse = loadedData[0];
    if (!firstCourse) return;

    const validatorId = dataSource === 'tikita'
      ? ValidatorIdEnum.SUEOP_AGGREGATE_TEACHITA_DEFAULT
      : ValidatorIdEnum.SUEOP_AGGREGATE_ACA2000_COMPAT;

    const students = firstCourse.students.map((s) => {
      const discount = acaStudentDiscounts.find((d) => d.name === s.name);
      return {
        name: s.name,
        school: s.school,
        attendance: s.attendance,
        nabipAmount: s.nabipAmount,
        unpaidAmount: s.unpaidAmount,
        discountRate: discount?.rate ?? s.discount * 100,
      };
    });

    const allDates = dataSource === 'aca2000'
      ? acaHoechaSchedule
      : makeDates(firstCourse.course.dayOfWeek);

    const conductedDates = allDates.filter((d) => students.some((s) => s.attendance[d] != null));
    const dates = conductedDates.length > 0 ? conductedDates : allDates;

    const rawInput = buildSueopAggregateInput({
      queryPeriodStart,
      queryPeriodEnd,
      courseName: firstCourse.course.name,
      sessionAmount: firstCourse.rule.unitPrice,
      textbookAmount: firstCourse.rule.gyojaeBi,
      hoechaSchedule: dates,
      students,
    });

    const validator = ValidatorStrategyMap[validatorId];
    const result = validator.run(rawInput);

    if (!result.success) {
      console.error('Validator input check failed:', result.message, result.errors);
      return;
    }

    const report = enrichReportWithIds(result.payload);
    const statuses: Record<string, FindingStatus> = {};
    for (const f of report.findings) {
      statuses[f.id] = state.findingStatuses[f.id] ?? 'pending';
    }

    set({ report, findingStatuses: statuses });
  },

  setFindingStatus: (findingId, status) =>
    set((state) => ({
      findingStatuses: { ...state.findingStatuses, [findingId]: status },
    })),

  updateAttendanceCell: (studentIdx, date, value) => {
    const state = get();
    const courseIdx = 0;
    const course = state.loadedData[courseIdx];
    if (!course) return;

    const updatedStudents = [...course.students];
    updatedStudents[studentIdx] = {
      ...updatedStudents[studentIdx],
      attendance: { ...updatedStudents[studentIdx].attendance, [date]: value },
    };

    const updatedCourse = { ...course, students: updatedStudents };
    const updatedLoadedData = [...state.loadedData];
    updatedLoadedData[courseIdx] = updatedCourse;

    set({ loadedData: updatedLoadedData });
  },

  setQueryPeriod: (start, end) => set({ queryPeriodStart: start, queryPeriodEnd: end }),
  setAcaHoechaSchedule: (dates) => set({ acaHoechaSchedule: dates }),
  setAcaStudentDiscounts: (discounts) => set({ acaStudentDiscounts: discounts }),

  setLoadedDataFromExcel: (data) => {
    const spreadsheet: Record<string, StudentRow[]> = {};
    data.forEach((cd) => {
      spreadsheet[cd.course.id] = cd.students.map((s) => ({ ...s }));
    });
    set({ loadedData: data, acaSpreadsheetData: spreadsheet });
  },

  updateCourseRule: (patch) => {
    const state = get();
    const first = state.loadedData[0];
    if (!first) return;
    const updated = { ...first, rule: { ...first.rule, ...patch } };
    const newLoadedData = [updated, ...state.loadedData.slice(1)];
    set({ loadedData: newLoadedData });
  },

  unlockSelection: () =>
    set({
      loadedData: [],
      findingStatuses: {},
      acaSpreadsheetData: {},
      report: null,
    }),

  resetSelection: () =>
    set({
      selectedGangjwaIds: [],
      loadedData: [],
      findingStatuses: {},
      acaSpreadsheetData: {},
      report: null,
    }),

  resetAll: () => set(initialState),
}));
