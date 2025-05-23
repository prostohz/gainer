import { TTimeframe } from '../../../../trading/types';

export type TCorrelation = {
  correlation: Partial<Record<TTimeframe, number>>;
  correlationRolling: Partial<Record<TTimeframe, { timestamp: number; value: number }[]>>;
  zScore: Partial<Record<TTimeframe, number>>;
  zScoreRolling: Partial<Record<TTimeframe, { timestamp: number; value: number }[]>>;
  cointegration: Partial<Record<TTimeframe, { isCointegrated: boolean }>>;
};

export type TCorrelationReportRecord = number | null;
export type TCorrelationReport = Record<string, TCorrelationReportRecord>;

export type TCorrelationClusters = string[][];
