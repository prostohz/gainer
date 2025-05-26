import { TTimeframe } from '../../shared/types';
import { PearsonCorrelation } from '../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { TIndicatorCandle } from '../trading/indicators/types';
import { ZScore } from '../trading/indicators/ZScore/ZScore';
import {
  TCointegrationResult,
  EngleGrangerTest,
} from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { Candle } from '../models/Candle';

const CANDLE_LIMIT = 1000;

const PEARSON_CANDLE_LIMIT = 500;
const Z_SCORE_CANDLE_LIMIT = 100;
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

  const correlationByPrices = {} as Record<TTimeframe, number>;
  const correlationByReturns = {} as Record<TTimeframe, number>;
  const rollingCorrelationByPrices = {} as Record<
    TTimeframe,
    { timestamp: number; value: number }[]
  >;
  const rollingCorrelationByReturns = {} as Record<
    TTimeframe,
    { timestamp: number; value: number }[]
  >;
  const zScoreByPrices = {} as Record<TTimeframe, number>;
  const zScoreByReturns = {} as Record<TTimeframe, number>;
  const rollingZScoreByPrices = {} as Record<TTimeframe, { timestamp: number; value: number }[]>;
  const rollingZScoreByReturns = {} as Record<TTimeframe, { timestamp: number; value: number }[]>;
  const cointegration = {} as Record<TTimeframe, TCointegrationResult>;

  const pearsonCorrelation = new PearsonCorrelation();
  const zScore = new ZScore();
  const engleGrangerTest = new EngleGrangerTest();

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
  };
};

export const getPairWiseZScore = async (symbols: string[] = [], timeframe: TTimeframe) => {
  const result: Record<string, number> = {};
  const zScore = new ZScore();

  const cache = new Map<string, TIndicatorCandle[]>();

  for (const symbolA of symbols) {
    let candlesA = cache.get(symbolA);
    if (!candlesA) {
      candlesA = await findCandles(symbolA, timeframe, Z_SCORE_CANDLE_LIMIT);
      cache.set(symbolA, candlesA);
    }

    for (const symbolB of symbols) {
      let candlesB = cache.get(symbolB);
      if (!candlesB) {
        candlesB = await findCandles(symbolB, timeframe, Z_SCORE_CANDLE_LIMIT);
        cache.set(symbolB, candlesB);
      }

      const pair = `${symbolA}-${symbolB}`;
      const pairReverse = `${symbolB}-${symbolA}`;

      if (symbolA === symbolB) {
        result[pair] = 0;
        continue;
      }

      if (result[pairReverse]) {
        result[pair] = result[pairReverse];
        continue;
      }

      result[pair] = zScore.zScoreByPrices(candlesA, candlesB);
    }
  }

  return result;
};
