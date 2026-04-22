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

  // --- Actions: UI (center) ---
  toggleRuleSelection: (teacherId: string, ruleId: string) => void;

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
  const mm = String(parseResult.month).padStart(2, "0");
  return {
    name: parseResult.sourceFileName,
    periodLabel: `${parseResult.year}-${mm} 페이 문서`,
    teacherCount: teacherNames.size,
  };
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
  setYear: (year) => set({ year }),
  setMonth: (month) => set({ month }),
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
      year: String(parseResult.year),
      month: String(parseResult.month),
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
