import { type z } from 'zod';

// ─── Result Type ─────────────────────────────────────────────────────────────

export type ValidationResult<T> =
  | { success: true; payload: T }
  | { success: false; message: string; errors: ValidationError[] };

export type ValidationError = {
  field: string;
  rule: string;
  message: string;
};

// ─── Finding (rich diagnostic unit) ─────────────────────────────────────────

export type FindingSeverity = 'error' | 'warning' | 'info';

export type FindingScope = {
  sugangsaengNanoId?: string;
  boonNanoId?: string;
  cheongguNanoId?: string;
};

export type ValidationFinding = {
  severity: FindingSeverity;
  category: string;
  field: string;
  message: string;
  reason: string;
  scope?: FindingScope;
  evidence?: Record<string, unknown>;
  suggestion?: string;
};

// ─── Cell Highlight ─────────────────────────────────────────────────────────

export type CellHighlight = {
  severity: FindingSeverity;
  message: string;
};

// ─── Validation Context ─────────────────────────────────────────────────────

export type ValidationContext<InputType, DerivedType = Record<string, unknown>> = {
  input: InputType;
  findings: ValidationFinding[];
  derived: DerivedType;
};

// ─── Validation Report (base) ───────────────────────────────────────────────

export type ValidationReport = {
  isValid: boolean;
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  findings: ValidationFinding[];
  findingsByCategory: Record<string, ValidationFinding[]>;
};

// ─── Validator Strategy Interface ────────────────────────────────────────────

export interface ValidatorStrategy<InputType, ReportType extends ValidationReport = ValidationReport> {
  checkInput(rawInput: unknown): ValidationResult<InputType>;

  process(input: InputType): ReportType;

  run(rawInput: unknown): ValidationResult<ReportType>;
}

// ─── Base Schema Constraint ──────────────────────────────────────────────────

export type ZodSchemaOf<T> = z.ZodType<T>;
