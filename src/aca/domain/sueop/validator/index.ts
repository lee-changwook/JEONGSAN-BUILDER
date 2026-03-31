export type {
  ValidatorStrategy,
  ValidationResult,
  ValidationError,
  ValidationFinding,
  FindingSeverity,
  FindingScope,
  CellHighlight,
  ValidationContext,
  ValidationReport,
} from './strategies/validator-strategy.type';

export {
  ValidatorIdEnum,
  ValidatorStrategyMap,
  numberToValidatedValidatorId,
} from './strategies/validator-strategy';

export { SueopAggregateValidatorStrategyImpl } from './strategies/sueop-aggregate/sueop-aggregate.validator-strategy.impl';
export { SueopAggregateCompatValidatorStrategyImpl } from './strategies/sueop-aggregate-compat/sueop-aggregate-compat.validator-strategy.impl';
export { parseAca2000Xlsx, parseAca2000Csv } from './strategies/sueop-aggregate-compat/aca2000-parser';
export type { Aca2000UserConfig, StudentHarinConfig } from './strategies/sueop-aggregate-compat/aca2000-parser';

export type {
  SueopAggregateInput,
  SueopAggregateReport,
  SueopAggregateDerived,
  Sugangsaeng,
  ConnectedKon,
  ConnectedBoon,
  ConnectedChulseokWorkBranch,
  HVector,
  ConnectedSueomnyo,
  BubunCheonggu,
  Sunap,
  Allim,
  SugangNaeyeok,
  SueopKon,
  SueopBoon,
  Sueop,
  QueryPeriod,
  KonCategory,
  HVectorCategory,
  SueomnyoScopeCategory,
  SugangsaengAnalysisRow,
  AttendanceCell,
  SueomnyoTimingDetail,
  SueopSummary,
  AmountBreakdown,
  AmountBreakdownLine,
  EnrollmentContext,
} from './strategies/sueop-aggregate/sueop-aggregate.validator-strategy.type';
