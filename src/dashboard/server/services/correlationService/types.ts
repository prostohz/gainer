import { TTimeframe } from '../../../../trading/types';

export type TCorrelation = {
  timeframes: Partial<Record<TTimeframe, number>>;
  overall: number;
};

export type TCorrelationReportRecord = number | null;
export type TCorrelationReport = Record<string, TCorrelationReportRecord>;
