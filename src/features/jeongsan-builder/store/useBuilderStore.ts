import { create } from "zustand";

import type {
  RuleItem,
  SettlementCalculator,
} from "@/features/jeongsan-builder/calculator";
import { createCalculator } from "@/features/jeongsan-builder/calculator";
import type { PayDocumentParseResult } from "@/features/jeongsan-builder/parser";

const _now = new Date();
const TODAY_YEAR = String(_now.getFullYear());
const TODAY_MONTH = String(_now.getMonth() + 1);

export interface UploadedFileInfo {
  name: string;
  periodLabel: string;
  teacherCount: number;
}

interface BuilderState {
  // Upload status / parseResult
  parseResult: PayDocumentParseResult | null;
  calculator: SettlementCalculator | null;

  // File metadata (표시용)
  pendingFile: File | null;
  payFile: UploadedFileInfo | null;
  prevPayoutFile: UploadedFileInfo | null;
  parseError: string | null;
  isParsing: boolean;

  // Period / 설정
  year: string;
  month: string;

  // Center panel (강사별 규칙 선택 상태 — UI 전용)
  selectedRuleIds: Record<string, Set<string>>;

  // Right panel
  activeTeacherId: string | null;
  instructorSearch: string;
  exportChecks: Set<string>;

  // AddItem modal
  // entryMode: 'unspecified' = 카테고리 선택 화면부터 / 나머지는 해당 플로우로 직접 진입
  addItemModal: {
    open: boolean;
    entryMode: "unspecified" | "revenue" | "plus" | "minus" | null;
  };

  // --- Actions: upload ---
  setYear: (year: string) => void;
  setMonth: (month: string) => void;
  setPendingFile: (file: File | null) => void;
  startParsing: () => void;
  ingestParseResult: (parseResult: PayDocumentParseResult) => void;
  setParseError: (message: string | null) => void;
  resetAll: () => void;
  removePayFile: () => void;
  removePrevPayoutFile: () => void;

  // --- Actions: teacher mutations (calculator로 위임) ---
  addTeacher: (input: { name: string; subjectLabel?: string }) => string | null;
  removeTeacher: (teacherId: string) => void;

  // --- Actions: rule mutations (calculator로 위임) ---
  addRule: (teacherId: string, rule: RuleItem) => void;
  updateRule: (
    teacherId: string,
    ruleId: string,
    patch: Partial<RuleItem>,
  ) => void;
  removeRule: (teacherId: string, ruleId: string) => void;
  bulkSetAux: (teacherId: string, ruleIds: string[], value: number) => void;
  bulkSetCustomBase: (
    teacherId: string,
    ruleIds: string[],
    customBase: number,
  ) => void;
  setRuleTaxable: (teacherId: string, ruleId: string, taxable: boolean) => void;
  bulkSetRuleTaxable: (
    teacherId: string,
    ruleIds: string[],
    taxable: boolean,
  ) => void;
  bulkSetRuleBase: (
    teacherId: string,
    ruleIds: string[],
    base: import("@/features/jeongsan-builder/calculator").BaseId,
  ) => void;
  bulkSetRuleOp: (
    teacherId: string,
    ruleIds: string[],
    op: import("@/features/jeongsan-builder/calculator").OpId,
  ) => void;
  moveRule: (teacherId: string, ruleId: string, toIndex: number) => void;

  // --- Actions: UI (center) ---
  toggleRuleSelection: (teacherId: string, ruleId: string) => void;
  selectAllRules: (teacherId: string) => void;
  clearRuleSelection: (teacherId: string) => void;

  // --- Actions: UI (right) ---
  setActiveTeacherId: (teacherId: string | null) => void;
  setInstructorSearch: (value: string) => void;
  toggleExportCheck: (teacherId: string) => void;

  // --- Actions: UI (add-item modal) ---
  openAddItemModal: (
    entryMode: "unspecified" | "revenue" | "plus" | "minus",
  ) => void;
  closeAddItemModal: () => void;
}

function fileInfoFromParseResult(
  parseResult: PayDocumentParseResult,
): UploadedFileInfo {
  const teacherNames = new Set<string>();
  for (const sheet of parseResult.sheets) {
    for (const block of sheet.blocks) {
      const name = block.teacherName.value.trim();
      if (name) teacherNames.add(name);
    }
  }
  return {
    name: parseResult.sourceFileName,
    periodLabel: makePeriodLabel(parseResult.year, parseResult.month),
    teacherCount: teacherNames.size,
  };
}

function makePeriodLabel(year: number, month: number): string {
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm} 페이 문서`;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  parseResult: null,
  calculator: null,

  pendingFile: null,
  payFile: null,
  prevPayoutFile: null,
  parseError: null,
  isParsing: false,

  year: TODAY_YEAR,
  month: TODAY_MONTH,

  selectedRuleIds: {},

  activeTeacherId: null,
  instructorSearch: "",
  exportChecks: new Set<string>(),

  addItemModal: { open: false, entryMode: null },

  // --- upload ---
  setYear: (year) =>
    set((state) => {
      const yearNum = Number(year);
      if (!state.parseResult || !state.calculator || !Number.isFinite(yearNum)) {
        return { year };
      }
      // 업로드 후 사용자가 월/연도를 바꾸면 calculator의 사용자 편집(rule)은 보존하고
      // 표시용 메타(year/month)만 갱신. parseResult를 새 year/month로 재포장한 뒤
      // 기존 rule을 initialRules로 넘겨 calculator를 재생성한다.
      const monthNum = Number(state.month);
      const nextParseResult: PayDocumentParseResult = {
        ...state.parseResult,
        year: yearNum,
        month: Number.isFinite(monthNum)
          ? monthNum
          : state.parseResult.month,
      };
      const { rulesByTeacher } = state.calculator.snapshot();
      return {
        year,
        parseResult: nextParseResult,
        calculator: createCalculator(nextParseResult, {
          initialRules: rulesByTeacher,
        }),
        payFile: fileInfoFromParseResult(nextParseResult),
      };
    }),
  setMonth: (month) =>
    set((state) => {
      const monthNum = Number(month);
      if (!state.parseResult || !state.calculator || !Number.isFinite(monthNum)) {
        return { month };
      }
      const yearNum = Number(state.year);
      const nextParseResult: PayDocumentParseResult = {
        ...state.parseResult,
        year: Number.isFinite(yearNum) ? yearNum : state.parseResult.year,
        month: monthNum,
      };
      const { rulesByTeacher } = state.calculator.snapshot();
      return {
        month,
        parseResult: nextParseResult,
        calculator: createCalculator(nextParseResult, {
          initialRules: rulesByTeacher,
        }),
        payFile: fileInfoFromParseResult(nextParseResult),
      };
    }),
  setPendingFile: (file) => set({ pendingFile: file, parseError: null }),

  startParsing: () => set({ isParsing: true, parseError: null }),

  ingestParseResult: (parseResult) => {
    const calculator = createCalculator(parseResult);
    const teachers = calculator.getTeachers();
    const firstTeacherId = teachers[0]?.id ?? null;

    set({
      parseResult,
      calculator,
      payFile: fileInfoFromParseResult(parseResult),
      // year/month는 사용자 선택값이 진실이므로 덮어쓰지 않는다.
      activeTeacherId: firstTeacherId,
      selectedRuleIds: {},
      exportChecks: new Set<string>(),
      instructorSearch: "",
      parseError: null,
      isParsing: false,
    });
  },

  setParseError: (message) => set({ parseError: message, isParsing: false }),

  resetAll: () =>
    set({
      parseResult: null,
      calculator: null,
      pendingFile: null,
      payFile: null,
      prevPayoutFile: null,
      parseError: null,
      isParsing: false,
      year: TODAY_YEAR,
      month: TODAY_MONTH,
      selectedRuleIds: {},
      activeTeacherId: null,
      instructorSearch: "",
      exportChecks: new Set<string>(),
    }),

  removePayFile: () =>
    set({
      parseResult: null,
      calculator: null,
      pendingFile: null,
      payFile: null,
      activeTeacherId: null,
      selectedRuleIds: {},
      exportChecks: new Set<string>(),
      parseError: null,
    }),

  removePrevPayoutFile: () => set({ prevPayoutFile: null }),

  // --- teacher mutations ---
  addTeacher: (input) => {
    let createdId: string | null = null;
    set((state) => {
      if (!state.calculator) return state;
      const { calculator, teacherId } = state.calculator.addTeacher(input);
      createdId = teacherId;
      return {
        calculator,
        activeTeacherId: teacherId,
      };
    });
    return createdId;
  },

  removeTeacher: (teacherId) =>
    set((state) => {
      if (!state.calculator) return state;
      const nextCalculator = state.calculator.removeTeacher(teacherId);
      const nextSelected = { ...state.selectedRuleIds };
      delete nextSelected[teacherId];
      const nextExport = new Set(state.exportChecks);
      nextExport.delete(teacherId);
      const nextActive =
        state.activeTeacherId === teacherId
          ? (nextCalculator.getTeachers()[0]?.id ?? null)
          : state.activeTeacherId;
      return {
        calculator: nextCalculator,
        selectedRuleIds: nextSelected,
        exportChecks: nextExport,
        activeTeacherId: nextActive,
      };
    }),

  // --- rule mutations ---
  addRule: (teacherId, rule) =>
    set((state) =>
      state.calculator
        ? { calculator: state.calculator.addRule(teacherId, rule) }
        : state,
    ),

  updateRule: (teacherId, ruleId, patch) =>
    set((state) =>
      state.calculator
        ? { calculator: state.calculator.updateRule(teacherId, ruleId, patch) }
        : state,
    ),

  removeRule: (teacherId, ruleId) =>
    set((state) => {
      if (!state.calculator) return state;
      const nextSelected = { ...state.selectedRuleIds };
      const teacherSet = nextSelected[teacherId];
      if (teacherSet?.has(ruleId)) {
        const cloned = new Set(teacherSet);
        cloned.delete(ruleId);
        nextSelected[teacherId] = cloned;
      }
      return {
        calculator: state.calculator.removeRule(teacherId, ruleId),
        selectedRuleIds: nextSelected,
      };
    }),

  bulkSetAux: (teacherId, ruleIds, value) =>
    set((state) =>
      state.calculator
        ? { calculator: state.calculator.bulkSetAux(teacherId, ruleIds, value) }
        : state,
    ),

  bulkSetCustomBase: (teacherId, ruleIds, customBase) =>
    set((state) =>
      state.calculator
        ? {
          calculator: state.calculator.bulkSetCustomBase(
            teacherId,
            ruleIds,
            customBase,
          ),
        }
        : state,
    ),

  setRuleTaxable: (teacherId, ruleId, taxable) =>
    set((state) =>
      state.calculator
        ? { calculator: state.calculator.setTaxable(teacherId, ruleId, taxable) }
        : state,
    ),

  bulkSetRuleTaxable: (teacherId, ruleIds, taxable) =>
    set((state) =>
      state.calculator
        ? {
          calculator: state.calculator.bulkSetTaxable(
            teacherId,
            ruleIds,
            taxable,
          ),
        }
        : state,
    ),

  bulkSetRuleBase: (teacherId, ruleIds, base) =>
    set((state) =>
      state.calculator
        ? {
          calculator: state.calculator.bulkSetBase(
            teacherId,
            ruleIds,
            base,
          ),
        }
        : state,
    ),

  bulkSetRuleOp: (teacherId, ruleIds, op) =>
    set((state) =>
      state.calculator
        ? { calculator: state.calculator.bulkSetOp(teacherId, ruleIds, op) }
        : state,
    ),

  moveRule: (teacherId, ruleId, toIndex) =>
    set((state) =>
      state.calculator
        ? { calculator: state.calculator.moveRule(teacherId, ruleId, toIndex) }
        : state,
    ),

  // --- center ui ---
  toggleRuleSelection: (teacherId, ruleId) =>
    set((state) => {
      const current = state.selectedRuleIds[teacherId] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return {
        selectedRuleIds: { ...state.selectedRuleIds, [teacherId]: next },
      };
    }),

  selectAllRules: (teacherId) =>
    set((state) => {
      if (!state.calculator) return state;
      const allIds = state.calculator.getRules(teacherId).map((r) => r.id);
      return {
        selectedRuleIds: {
          ...state.selectedRuleIds,
          [teacherId]: new Set(allIds),
        },
      };
    }),

  clearRuleSelection: (teacherId) =>
    set((state) => ({
      selectedRuleIds: {
        ...state.selectedRuleIds,
        [teacherId]: new Set<string>(),
      },
    })),

  // --- right ui ---
  setActiveTeacherId: (teacherId) => set({ activeTeacherId: teacherId }),
  setInstructorSearch: (value) => set({ instructorSearch: value }),

  toggleExportCheck: (teacherId) =>
    set((state) => {
      const next = new Set(state.exportChecks);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return { exportChecks: next };
    }),

  // --- add-item modal ---
  openAddItemModal: (entryMode) =>
    set({ addItemModal: { open: true, entryMode } }),

  closeAddItemModal: () =>
    set({ addItemModal: { open: false, entryMode: null } }),
}));
