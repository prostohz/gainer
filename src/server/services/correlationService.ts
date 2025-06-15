import { TTimeframe } from '../../shared/types';
import { PearsonCorrelation } from '../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { TIndicatorCandle } from '../trading/indicators/types';
import { ZScore } from '../trading/indicators/ZScore/ZScore';
import {
  TCointegrationResult,
  EngleGrangerTest,
} from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { BetaHedge } from '../trading/indicators/BetaHedge/BetaHedge';
import { Candle } from '../models/Candle';

const CANDLE_LIMIT = 1000;

const PEARSON_CANDLE_LIMIT = 500;
const Z_SCORE_CANDLE_LIMIT = 20;
const COINTEGRATION_CANDLE_LIMIT = 500;

const findCandles = async (
  symbol: string,
  timeframe: TTimeframe,
  limit: number,
): Promise<TIndicatorCandle[]> => {
  const candles = await Candle.findAll({
    where: {
      symbol,
      timeframe,
    },
    limit,
  });

  return candles.map((candle) => ({
    openTime: candle.openTime,
    closeTime: candle.closeTime,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
  }));
};

export const getPairCorrelation = async (symbolA: string, symbolB: string) => {
  const timeframes: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  const correlationByPrices = {} as Record<TTimeframe, number | null>;
  const correlationByReturns = {} as Record<TTimeframe, number | null>;
  const rollingCorrelationByPrices = {} as Record<
    TTimeframe,
    { timestamp: number; value: number | null }[]
  >;
  const rollingCorrelationByReturns = {} as Record<
    TTimeframe,
    { timestamp: number; value: number | null }[]
  >;
  const zScoreByPrices = {} as Record<TTimeframe, number | null>;
  const zScoreByReturns = {} as Record<TTimeframe, number | null>;
  const rollingZScoreByPrices = {} as Record<
    TTimeframe,
    { timestamp: number; value: number | null }[]
  >;
  const rollingZScoreByReturns = {} as Record<
    TTimeframe,
    { timestamp: number; value: number | null }[]
  >;
  const cointegration = {} as Record<TTimeframe, TCointegrationResult | null>;
  const betaHedge = {} as Record<TTimeframe, number | null>;

  const pearsonCorrelation = new PearsonCorrelation();
  const zScore = new ZScore();
  const engleGrangerTest = new EngleGrangerTest();
  const betaHedgeIndicator = new BetaHedge();

  for (const timeframe of timeframes) {
    const [candlesA, candlesB] = await Promise.all([
      findCandles(symbolA, timeframe, CANDLE_LIMIT),
      findCandles(symbolB, timeframe, CANDLE_LIMIT),
    ]);

    correlationByPrices[timeframe] = pearsonCorrelation.correlationByPrices(
      candlesA.slice(0, PEARSON_CANDLE_LIMIT),
      candlesB.slice(0, PEARSON_CANDLE_LIMIT),
    );
    correlationByReturns[timeframe] = pearsonCorrelation.correlationByReturns(
      candlesA.slice(0, PEARSON_CANDLE_LIMIT),
      candlesB.slice(0, PEARSON_CANDLE_LIMIT),
    );
    zScoreByPrices[timeframe] = zScore.zScoreByPrices(
      candlesA.slice(0, Z_SCORE_CANDLE_LIMIT),
      candlesB.slice(0, Z_SCORE_CANDLE_LIMIT),
    );
    zScoreByReturns[timeframe] = zScore.zScoreByReturns(
      candlesA.slice(0, Z_SCORE_CANDLE_LIMIT),
      candlesB.slice(0, Z_SCORE_CANDLE_LIMIT),
    );
    cointegration[timeframe] = engleGrangerTest.calculateCointegration(
      candlesA.slice(0, COINTEGRATION_CANDLE_LIMIT),
      candlesB.slice(0, COINTEGRATION_CANDLE_LIMIT),
    );
    rollingCorrelationByPrices[timeframe] = pearsonCorrelation.rollingCorrelationByPrices(
      candlesA,
      candlesB,
    );
    rollingCorrelationByReturns[timeframe] = pearsonCorrelation.rollingCorrelationByReturns(
      candlesA,
      candlesB,
    );
    rollingZScoreByPrices[timeframe] = zScore.rollingZScoreByPrices(candlesA, candlesB);
    rollingZScoreByReturns[timeframe] = zScore.rollingZScoreByReturns(candlesA, candlesB);
    betaHedge[timeframe] = betaHedgeIndicator.calculateBeta(
      candlesA.map((candle) => candle.close),
      candlesB.map((candle) => candle.close),
    );
  }

  return {
    correlationByPrices,
    correlationByReturns,
    zScoreByPrices,
    zScoreByReturns,
    rollingCorrelationByPrices,
    rollingCorrelationByReturns,
    rollingZScoreByPrices,
    rollingZScoreByReturns,
    cointegration,
    betaHedge,
  };
};
