import { create } from "zustand";

export interface UploadedFileInfo {
  name: string;
  periodLabel: string;
  teacherCount: number;
}

interface BuilderState {
  // Upload / period
  uploaded: boolean;
  payFile: UploadedFileInfo | null;
  prevPayoutFile: UploadedFileInfo | null;
  year: string;
  month: string;
  cardFeeRate: string;

  // Center panel (item table)
  selectedRows: Set<number>;
  auxValues: Record<number, string>;
  taxFlags: Record<number, boolean>;

  // Right panel (instructor list)
  activeInstructor: string | null;
  instructorSearch: string;
  exportChecks: Set<string>;

  // Actions — upload
  setYear: (year: string) => void;
  setMonth: (month: string) => void;
  setCardFeeRate: (rate: string) => void;
  buildSettlement: () => void;
  resetAll: () => void;
  attachMockPayFile: () => void;
  attachMockPrevPayoutFile: () => void;
  removePayFile: () => void;
  removePrevPayoutFile: () => void;

  // Actions — center
  toggleRow: (index: number) => void;
  setAux: (index: number, value: string) => void;
  applyAuxRange: (fromIndex: number, toIndex: number, value: string) => void;
  setTax: (index: number, next: boolean) => void;
  initAuxFromDefaults: (defaults: Record<number, string>) => void;
  initTaxFromDefaults: (defaults: Record<number, boolean>) => void;

  // Actions — right
  setActiveInstructor: (name: string) => void;
  setInstructorSearch: (value: string) => void;
  toggleExportCheck: (name: string) => void;
}

const INITIAL_PAY_FILE: UploadedFileInfo = {
  name: "pay_2026_04.xlsx",
  periodLabel: "2026-04-01 ~ 2026-04-30",
  teacherCount: 12,
};

export const useBuilderStore = create<BuilderState>((set) => ({
  uploaded: false,
  payFile: null,
  prevPayoutFile: null,
  year: "2026",
  month: "5",
  cardFeeRate: "0.035",

  selectedRows: new Set<number>([0]),
  auxValues: {},
  taxFlags: {},

  activeInstructor: "김명훈T",
  instructorSearch: "",
  exportChecks: new Set<string>(),

  setYear: (year) => set({ year }),
  setMonth: (month) => set({ month }),
  setCardFeeRate: (cardFeeRate) => set({ cardFeeRate }),

  buildSettlement: () =>
    set({
      uploaded: true,
      payFile: INITIAL_PAY_FILE,
      month: "4",
    }),

  resetAll: () =>
    set({
      uploaded: false,
      payFile: null,
      prevPayoutFile: null,
      year: "2026",
      month: "5",
      cardFeeRate: "0.035",
      selectedRows: new Set<number>([0]),
      auxValues: {},
      taxFlags: {},
      activeInstructor: "김명훈T",
      instructorSearch: "",
      exportChecks: new Set<string>(),
    }),

  attachMockPayFile: () =>
    set({
      payFile: INITIAL_PAY_FILE,
      month: "4",
    }),

  attachMockPrevPayoutFile: () =>
    set({
      prevPayoutFile: {
        name: "prev_payout_2026_03.xlsx",
        periodLabel: "2026-03-01 ~ 2026-03-31",
        teacherCount: 12,
      },
    }),

  removePayFile: () => set({ payFile: null, uploaded: false }),

  removePrevPayoutFile: () => set({ prevPayoutFile: null }),

  toggleRow: (index) =>
    set((state) => {
      const next = new Set(state.selectedRows);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { selectedRows: next };
    }),

  setAux: (index, value) =>
    set((state) => ({ auxValues: { ...state.auxValues, [index]: value } })),

  applyAuxRange: (fromIndex, toIndex, value) =>
    set((state) => {
      const [start, end] =
        fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
      const next = { ...state.auxValues };
      for (let i = start; i <= end; i += 1) {
        next[i] = value;
      }
      return { auxValues: next };
    }),

  setTax: (index, tax) =>
    set((state) => ({ taxFlags: { ...state.taxFlags, [index]: tax } })),

  initAuxFromDefaults: (defaults) =>
    set((state) => {
      if (Object.keys(state.auxValues).length > 0) return state;
      return { auxValues: defaults };
    }),

  initTaxFromDefaults: (defaults) =>
    set((state) => {
      if (Object.keys(state.taxFlags).length > 0) return state;
      return { taxFlags: defaults };
    }),

  setActiveInstructor: (name) => set({ activeInstructor: name }),
  setInstructorSearch: (value) => set({ instructorSearch: value }),

  toggleExportCheck: (name) =>
    set((state) => {
      const next = new Set(state.exportChecks);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { exportChecks: next };
    }),
}));
