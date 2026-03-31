import type { ValidatorStrategy } from './validator-strategy.type';
import { SueopAggregateValidatorStrategyImpl } from './sueop-aggregate/sueop-aggregate.validator-strategy.impl';
import { SueopAggregateCompatValidatorStrategyImpl } from './sueop-aggregate-compat/sueop-aggregate-compat.validator-strategy.impl';
import type { SueopAggregateInput, SueopAggregateReport } from './sueop-aggregate/sueop-aggregate.validator-strategy.type';

// ─── Validator ID Enum ───────────────────────────────────────────────────────

export const ValidatorIdEnum = {
  SUEOP_AGGREGATE_TEACHITA_DEFAULT: 1_001,
  SUEOP_AGGREGATE_ACA2000_COMPAT: 1_002,
} as const;
export type ValidatorId = (typeof ValidatorIdEnum)[keyof typeof ValidatorIdEnum];

// ─── Strategy Map ────────────────────────────────────────────────────────────

type ValidatorStrategyMapType = {
  [ValidatorIdEnum.SUEOP_AGGREGATE_TEACHITA_DEFAULT]: ValidatorStrategy<SueopAggregateInput, SueopAggregateReport>;
  [ValidatorIdEnum.SUEOP_AGGREGATE_ACA2000_COMPAT]: ValidatorStrategy<SueopAggregateInput, SueopAggregateReport>;
};

export const ValidatorStrategyMap: ValidatorStrategyMapType = {
  [ValidatorIdEnum.SUEOP_AGGREGATE_TEACHITA_DEFAULT]: SueopAggregateValidatorStrategyImpl.getInstance(),
  [ValidatorIdEnum.SUEOP_AGGREGATE_ACA2000_COMPAT]: SueopAggregateCompatValidatorStrategyImpl.getInstance(),
};

// ─── ID Resolver ─────────────────────────────────────────────────────────────

const validIds = new Set<number>(Object.values(ValidatorIdEnum));

export function numberToValidatedValidatorId(id: number): ValidatorId {
  if (!validIds.has(id)) {
    throw new Error(`Invalid validator ID: ${id}`);
  }
  return id as ValidatorId;
}
