export type TTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export type TCorrelationRecord<T> = Partial<Record<TTimeframe, T>>;

export type TCointegration = {
  isCointegrated: boolean;
  pValue: number;
};

export type TCorrelation = {
  correlationByPrices: TCorrelationRecord<number>;
  correlationByReturns: TCorrelationRecord<number>;
  rollingCorrelationByPrices: TCorrelationRecord<{ timestamp: number; value: number }[]>;
  rollingCorrelationByReturns: TCorrelationRecord<{ timestamp: number; value: number }[]>;
  zScoreByPrices: TCorrelationRecord<number>;
  zScoreByReturns: TCorrelationRecord<number>;
  rollingZScoreByPrices: TCorrelationRecord<{ timestamp: number; value: number }[]>;
  rollingZScoreByReturns: TCorrelationRecord<{ timestamp: number; value: number }[]>;
  cointegration: TCorrelationRecord<TCointegration>;
};
export type TCorrelationReportRecord = number | null;
export type TCorrelationReport = Record<string, TCorrelationReportRecord>;
export type TCorrelationReportClusters = string[][];

export type TPriceLevelItem = {
  price: number;
  strength: number;
};
export type TPriceLevels = {
  supportLevels: TPriceLevelItem[];
  resistanceLevels: TPriceLevelItem[];
};
