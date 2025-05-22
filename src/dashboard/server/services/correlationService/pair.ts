import * as R from 'remeda';

import { TCandle, TTimeframe } from '../../../../trading/types';
import { PearsonCorrelation } from '../../../../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { ZScore } from '../../../../trading/indicators/ZScore/ZScore';
import { EngleGrangerTest } from '../../../../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { getAssetCandles } from '../assetService';

const TIMEFRAMES: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

type TOptions = {
  timeframes: TTimeframe[];
};

const CANDLE_LIMIT = 1000;
const PEARSON_CANDLE_LIMIT = 500;
const Z_SCORE_CANDLE_LIMIT = 100;
const COINTEGRATION_CANDLE_LIMIT = 500;

export const getPearsonCorrelation = async (
  symbolA: string,
  symbolB: string,
  timeframe: TTimeframe,
) => {
  const [timeframeCandlesA, timeframeCandlesB] = await Promise.all([
    getAssetCandles(symbolA, timeframe, CANDLE_LIMIT),
    getAssetCandles(symbolB, timeframe, CANDLE_LIMIT),
  ]);

  const pearsonCorrelation = new PearsonCorrelation();
  const multipleTimeframeCorrelation = pearsonCorrelation.calculateSingleTimeframeCorrelation(
    timeframeCandlesA,
    timeframeCandlesB,
  );

  return multipleTimeframeCorrelation;
};

export const getPairCorrelation = async (
  symbolA: string,
  symbolB: string,
  options: TOptions = {
    timeframes: TIMEFRAMES,
  },
) => {
  const { timeframes } = options;

  const [timeframeCandlesA, timeframeCandlesB] = await Promise.all([
    Promise.all(timeframes.map((timeframe) => getAssetCandles(symbolA, timeframe, CANDLE_LIMIT))),
    Promise.all(timeframes.map((timeframe) => getAssetCandles(symbolB, timeframe, CANDLE_LIMIT))),
  ]);

  const timeframeCandlesMapA = R.fromEntries(R.zip(timeframes, timeframeCandlesA)) as Record<
    TTimeframe,
    TCandle[]
  >;

  const timeframeCandlesMapB = R.fromEntries(R.zip(timeframes, timeframeCandlesB)) as Record<
    TTimeframe,
    TCandle[]
  >;

  const pearsonCorrelation = new PearsonCorrelation();
  const multipleTimeframeCorrelation = pearsonCorrelation.calculateMultipleTimeframeCorrelation(
    R.mapValues(timeframeCandlesMapA, (candles) => candles.slice(-PEARSON_CANDLE_LIMIT)),
    R.mapValues(timeframeCandlesMapB, (candles) => candles.slice(-PEARSON_CANDLE_LIMIT)),
  );

  const zScore = new ZScore();
  const multipleTimeframeZScore = zScore.calculateMultipleTimeframeZScore(
    R.mapValues(timeframeCandlesMapA, (candles) => candles.slice(-Z_SCORE_CANDLE_LIMIT)),
    R.mapValues(timeframeCandlesMapB, (candles) => candles.slice(-Z_SCORE_CANDLE_LIMIT)),
  );
  const multipleTimeframeZScoreHistory = zScore.calculateMultipleTimeframeZScoreHistory(
    timeframeCandlesMapA,
    timeframeCandlesMapB,
  );

  // Выполнение теста Энгла-Грейнджера для проверки коинтеграции
  const engleGrangerTest = new EngleGrangerTest();
  const multipleTimeframeCointegration = engleGrangerTest.calculateMultipleTimeframeCointegration(
    R.mapValues(timeframeCandlesMapA, (candles) => candles.slice(-COINTEGRATION_CANDLE_LIMIT)),
    R.mapValues(timeframeCandlesMapB, (candles) => candles.slice(-COINTEGRATION_CANDLE_LIMIT)),
  );

  return {
    correlation: multipleTimeframeCorrelation,
    zScore: multipleTimeframeZScore,
    zScoreHistory: multipleTimeframeZScoreHistory,
    cointegration: multipleTimeframeCointegration,
  };
};

export const getPairWiseZScore = async (symbols: string[] = [], timeframe: TTimeframe = '1m') => {
  const result: Record<string, number> = {};

  const zScore = new ZScore();

  for (const symbolA of symbols) {
    await getAssetCandles(symbolA, timeframe, 100);
  }

  for (const symbolA of symbols) {
    for (const symbolB of symbols) {
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

      const [timeframeCandlesA, timeframeCandlesB] = await Promise.all([
        getAssetCandles(symbolA, timeframe, Z_SCORE_CANDLE_LIMIT),
        getAssetCandles(symbolB, timeframe, Z_SCORE_CANDLE_LIMIT),
      ]);

      result[pair] = zScore.calculateZScore(timeframeCandlesA, timeframeCandlesB);
    }
  }

  return result;
};
