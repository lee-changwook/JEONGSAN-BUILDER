export type FindingSeverity = 'error' | 'warning' | 'info';

export interface CellHighlight {
  severity: FindingSeverity;
  message: string;
}

export interface ValidationFinding {
  id: string;
  severity: FindingSeverity;
  category: string;
  message: string;
  reason: string;
  evidence: Record<string, string | number>;
  suggestion: string;
  scope: {
    sugangsaengNanoId: string | null;
    boonNanoId: string | null;
  } | null;
}

export type ValidatorResult<T> =
  | { success: true; payload: T }
  | { success: false; error: string };
