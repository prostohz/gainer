export type TTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

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

export type TPriceLevelItem = {
  price: number;
  strength: number;
};
export type TPriceLevels = {
  supportLevels: TPriceLevelItem[];
  resistanceLevels: TPriceLevelItem[];
};
