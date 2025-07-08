import { TCompleteTrade } from '../server/trading/strategies/MRStrategy/backtest';

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

export type TMRReportPair = {
  assetA: {
    baseAsset: string;
    quoteAsset: string;
  };
  assetB: {
    baseAsset: string;
    quoteAsset: string;
  };
  pValue: number;
  halfLife: number;
  correlationByPrices: number;
  correlationByReturns: number;
  crossings: number;
  spread: {
    mean: number;
    median: number;
    std: number;
  };
  score: number;
};
export type TMRReportTag = {
  id: number;
  code: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};
export type TMRReport = {
  id: number;
  date: number;
  tagId: number;
  pairs?: TMRReportPair[];
  pairsCount?: number;
  lastBacktestAt: Date | null;
  backtestTrades: TCompleteTrade[] | null;
};

export type TPriceLevelItem = {
  price: number;
  strength: number;
};
export type TPriceLevels = {
  supportLevels: TPriceLevelItem[];
  resistanceLevels: TPriceLevelItem[];
};
