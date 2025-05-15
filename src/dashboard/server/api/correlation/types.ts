import { TTimeframe } from '../../../../trading/types';

export type TCorrelation = {
  timeframes: Partial<Record<TTimeframe, number>>;
  overall: number;
};
