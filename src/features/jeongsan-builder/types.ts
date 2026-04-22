export type SettlementItemKind = "revenue" | "pay" | "deduct";

export interface DropdownOption {
  id: string;
  name: string;
}

export interface BaseValueDropdown {
  type: "dropdown";
  options: DropdownOption[];
  value: string;
  computed: string;
}

export interface BaseValueInput {
  type: "input";
  value: string;
}

export type BaseValue = BaseValueDropdown | BaseValueInput;

export interface OperationField {
  options: DropdownOption[];
  value: string;
}

export interface SettlementItemRow {
  code: string;
  kind: SettlementItemKind;
  name: string;
  detail?: string;
  sub?: string | null;
  base: BaseValue;
  op: OperationField;
  aux: string;
  tax: boolean;
  formula: string;
  result: number;
  needsReview: boolean;
}

export type InstructorDot = "green" | "yellow";

export interface InstructorListItem {
  name: string;
  subject: string;
  amount: string;
  dot: InstructorDot;
  active?: boolean;
}

export interface InstructorCardSummary {
  name: string;
  subjects: string;
  itemCount: number;
  gross: number;
  deduct: number;
  settle: number;
  wth: number;
  taxable: number;
  net: number;
  reviewCount: number;
}
