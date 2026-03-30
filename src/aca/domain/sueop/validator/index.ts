export type { ValidatorStrategy } from './strategies/validator-strategy';
export type { ValidatorResult, FindingSeverity, CellHighlight, ValidationFinding } from './strategies/validator-strategy.type';
export type {
  SueopAggregateInput,
  SueopAggregateReport,
  SugangsaengAnalysisRow,
  AttendanceCell,
  SueopSummary,
  AmountBreakdown,
  AmountBreakdownLine,
  EnrollmentContext,
  SueomnyoTimingDetail,
  HVectorCategory,
  KonCategory,
} from './strategies/sueop-aggregate/sueop-aggregate.validator-strategy.type';

import { SueopAggregateValidatorStrategy } from './strategies/sueop-aggregate/sueop-aggregate.validator-strategy.impl';
import { SueopAggregateCompatValidatorStrategy } from './strategies/sueop-aggregate-compat/sueop-aggregate-compat.validator-strategy.impl';
import type { SueopAggregateInput, SueopAggregateReport } from './strategies/sueop-aggregate/sueop-aggregate.validator-strategy.type';
import type { ValidatorStrategy } from './strategies/validator-strategy';

export const ValidatorIdEnum = {
  SUEOP_AGGREGATE_TEACHITA_DEFAULT: 'sueop-aggregate-teachita-default',
  SUEOP_AGGREGATE_ACA2000_COMPAT: 'sueop-aggregate-aca2000-compat',
} as const;

export type ValidatorId = (typeof ValidatorIdEnum)[keyof typeof ValidatorIdEnum];

export const ValidatorStrategyMap: Record<
  ValidatorId,
  ValidatorStrategy<SueopAggregateInput, SueopAggregateReport>
> = {
  [ValidatorIdEnum.SUEOP_AGGREGATE_TEACHITA_DEFAULT]: new SueopAggregateValidatorStrategy(
    ValidatorIdEnum.SUEOP_AGGREGATE_TEACHITA_DEFAULT,
  ),
  [ValidatorIdEnum.SUEOP_AGGREGATE_ACA2000_COMPAT]: new SueopAggregateCompatValidatorStrategy(
    ValidatorIdEnum.SUEOP_AGGREGATE_ACA2000_COMPAT,
  ),
};
