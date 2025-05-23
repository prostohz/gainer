import { TCandle, TTimeframe } from '../../../../trading/types';
import { PearsonCorrelation } from '../../../../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { ZScore } from '../../../../trading/indicators/ZScore/ZScore';
import {
  CointegrationResult,
  EngleGrangerTest,
} from '../../../../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { CandleRepository } from '../../repositories/CandleRepository';

const CANDLE_LIMIT = 1000;
const PEARSON_CANDLE_LIMIT = 500;
const Z_SCORE_CANDLE_LIMIT = 100;
const COINTEGRATION_CANDLE_LIMIT = 500;

const candleRepository = CandleRepository.getInstance();

export const getPairCorrelation = async (symbolA: string, symbolB: string) => {
  const timeframes: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  const pearsonCorrelation = new PearsonCorrelation();

  const multipleTimeframeCorrelation = {} as Record<TTimeframe, number>;
  for (const timeframe of timeframes) {
    multipleTimeframeCorrelation[timeframe] = pearsonCorrelation.calculateCorrelation(
      candleRepository.getCandles(symbolA, timeframe, PEARSON_CANDLE_LIMIT),
      candleRepository.getCandles(symbolB, timeframe, PEARSON_CANDLE_LIMIT),
    );
  }

  const multipleTimeframeCorrelationRolling = {} as Record<
    TTimeframe,
    { timestamp: number; value: number }[]
  >;
  for (const timeframe of timeframes) {
    multipleTimeframeCorrelationRolling[timeframe] = pearsonCorrelation.calculateCorrelationRolling(
      candleRepository.getCandles(symbolA, timeframe, CANDLE_LIMIT),
      candleRepository.getCandles(symbolB, timeframe, CANDLE_LIMIT),
    );
  }

  const zScore = new ZScore();

  const multipleTimeframeZScore = {} as Record<TTimeframe, number>;
  for (const timeframe of timeframes) {
    multipleTimeframeZScore[timeframe] = zScore.calculateZScore(
      candleRepository.getCandles(symbolA, timeframe, Z_SCORE_CANDLE_LIMIT),
      candleRepository.getCandles(symbolB, timeframe, Z_SCORE_CANDLE_LIMIT),
    );
  }

  const multipleTimeframeZScoreRolling = {} as Record<
    TTimeframe,
    { timestamp: number; value: number }[]
  >;
  for (const timeframe of timeframes) {
    multipleTimeframeZScoreRolling[timeframe] = zScore.calculateZScoreRolling(
      candleRepository.getCandles(symbolA, timeframe, CANDLE_LIMIT),
      candleRepository.getCandles(symbolB, timeframe, CANDLE_LIMIT),
    );
  }

  const engleGrangerTest = new EngleGrangerTest();

  const multipleTimeframeCointegration = {} as Record<TTimeframe, CointegrationResult>;
  for (const timeframe of timeframes) {
    multipleTimeframeCointegration[timeframe] = engleGrangerTest.calculateCointegration(
      candleRepository.getCandles(symbolA, timeframe, COINTEGRATION_CANDLE_LIMIT),
      candleRepository.getCandles(symbolB, timeframe, COINTEGRATION_CANDLE_LIMIT),
    );
  }

  return {
    correlation: multipleTimeframeCorrelation,
    correlationRolling: multipleTimeframeCorrelationRolling,
    zScore: multipleTimeframeZScore,
    zScoreRolling: multipleTimeframeZScoreRolling,
    cointegration: multipleTimeframeCointegration,
  };
};

export const getPairWiseZScore = async (symbols: string[] = [], timeframe: TTimeframe = '1m') => {
  const result: Record<string, number> = {};
  const zScore = new ZScore();

  const cache = new Map<string, TCandle[]>();

  for (const symbolA of symbols) {
    const candlesA =
      cache.get(symbolA) || candleRepository.getCandles(symbolA, timeframe, Z_SCORE_CANDLE_LIMIT);
    cache.set(symbolA, candlesA);

    for (const symbolB of symbols) {
      const candlesB =
        cache.get(symbolB) || candleRepository.getCandles(symbolB, timeframe, Z_SCORE_CANDLE_LIMIT);
      cache.set(symbolB, candlesB);

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

      result[pair] = zScore.calculateZScore(candlesA, candlesB);
    }
  }

  return result;
};
