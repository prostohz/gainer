export type TTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export type TCorrelationRecord<T> = Partial<Record<TTimeframe, T>>;
export type TCorrelationRollingEntry = { timestamp: number; value: number | null };
export type TCointegration = {
  pValue: number;
};
export type TCorrelation = {
  correlationByPrices: TCorrelationRecord<number | null>;
  correlationByReturns: TCorrelationRecord<number | null>;
  rollingCorrelationByPrices: TCorrelationRecord<TCorrelationRollingEntry[]>;
  rollingCorrelationByReturns: TCorrelationRecord<TCorrelationRollingEntry[]>;
  zScoreByPrices: TCorrelationRecord<number | null>;
  zScoreByReturns: TCorrelationRecord<number | null>;
  rollingZScoreByPrices: TCorrelationRecord<TCorrelationRollingEntry[]>;
  rollingZScoreByReturns: TCorrelationRecord<TCorrelationRollingEntry[]>;
  cointegration: TCorrelationRecord<TCointegration | null>;
  betaHedge: TCorrelationRecord<number | null>;
};

export type TPairReportEntry = {
  pValue: number | null;
  halfLife: number | null;
  hurstExponent: number | null;
  correlationByPrices: number | null;
  correlationByReturns: number | null;
  beta: number | null;
  crossings: number | null;
  spread: {
    mean: number;
    median: number;
    std: number;
  } | null;
} | null;
export type TPairReportList = ({
  pair: string;
} & NonNullable<TPairReportEntry>)[];
export type TPairReportMeta = {
  id: string;
  date: number;
};
export type TPairReportMap = Record<string, TPairReportEntry>;

export type TPriceLevelItem = {
  price: number;
  strength: number;
};
export type TPriceLevels = {
  supportLevels: TPriceLevelItem[];
  resistanceLevels: TPriceLevelItem[];
};
