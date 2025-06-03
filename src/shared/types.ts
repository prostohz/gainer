export type TTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export type TCorrelationRecord<T> = Partial<Record<TTimeframe, T>>;
export type TCorrelationRollingEntry = { timestamp: number; value: number };
export type TCointegration = {
  isCointegrated: boolean;
  pValue: number;
};
export type TCorrelation = {
  correlationByPrices: TCorrelationRecord<number>;
  correlationByReturns: TCorrelationRecord<number>;
  rollingCorrelationByPrices: TCorrelationRecord<TCorrelationRollingEntry[]>;
  rollingCorrelationByReturns: TCorrelationRecord<TCorrelationRollingEntry[]>;
  zScoreByPrices: TCorrelationRecord<number>;
  zScoreByReturns: TCorrelationRecord<number>;
  rollingZScoreByPrices: TCorrelationRecord<TCorrelationRollingEntry[]>;
  rollingZScoreByReturns: TCorrelationRecord<TCorrelationRollingEntry[]>;
  cointegration: TCorrelationRecord<TCointegration>;
};

export type TCorrelationReportList = {
  pair: string;
  pValue: number;
  halfLife: number;
}[];
export type TCorrelationReportMapEntry = { pValue: number; halfLife: number } | null;
export type TCorrelationReportMap = Record<string, TCorrelationReportMapEntry>;
export type TCorrelationReportClusters = string[][];
export type TCorrelationReportFilters = {
  usdtOnly: boolean;
  ignoreUsdtUsdc: boolean;
  maxPValue: number;
  maxHalfLife: number;
  minVolume: number;
};

export type TPriceLevelItem = {
  price: number;
  strength: number;
};
export type TPriceLevels = {
  supportLevels: TPriceLevelItem[];
  resistanceLevels: TPriceLevelItem[];
};
