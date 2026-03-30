import type { ValidatorResult } from './validator-strategy.type';

export interface ValidatorStrategy<TInput, TOutput> {
  id: string;
  run(input: TInput): ValidatorResult<TOutput>;
}
