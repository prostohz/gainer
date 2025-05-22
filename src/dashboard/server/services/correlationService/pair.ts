import * as R from 'remeda';

import { TKline, TTimeframe } from '../../../../trading/types';
import { PearsonCorrelation } from '../../../../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { ZScore } from '../../../../trading/indicators/ZScore/ZScore';
import { EngleGrangerTest } from '../../../../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { getAssetKlines } from '../assetService';

const TIMEFRAMES: TTimeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];

type TOptions = {
  timeframes: TTimeframe[];
};

const CANDLE_LIMIT = 1000;
const PEARSON_CANDLE_LIMIT = 500;
const Z_SCORE_CANDLE_LIMIT = 100;
const COINTEGRATION_CANDLE_LIMIT = 500;

export const getPairCorrelation = async (
  symbolA: string,
  symbolB: string,
  options: TOptions = {
    timeframes: TIMEFRAMES,
  },
) => {
  const { timeframes } = options;

  const [timeframeKlinesA, timeframeKlinesB] = await Promise.all([
    Promise.all(
      timeframes.map((timeframe) => getAssetKlines(symbolA, timeframe, CANDLE_LIMIT, true)),
    ),
    Promise.all(
      timeframes.map((timeframe) => getAssetKlines(symbolB, timeframe, CANDLE_LIMIT, true)),
    ),
  ]);

  const timeframeKlinesMapA = R.fromEntries(R.zip(timeframes, timeframeKlinesA)) as Record<
    TTimeframe,
    TKline[]
  >;

  const timeframeKlinesMapB = R.fromEntries(R.zip(timeframes, timeframeKlinesB)) as Record<
    TTimeframe,
    TKline[]
  >;

  const pearsonCorrelation = new PearsonCorrelation();
  const multipleTimeframeCorrelation = pearsonCorrelation.calculateMultipleTimeframeCorrelation(
    R.mapValues(timeframeKlinesMapA, (klines) => klines.slice(-PEARSON_CANDLE_LIMIT)),
    R.mapValues(timeframeKlinesMapB, (klines) => klines.slice(-PEARSON_CANDLE_LIMIT)),
  );

  const zScore = new ZScore();
  const multipleTimeframeZScore = zScore.calculateMultipleTimeframeZScore(
    R.mapValues(timeframeKlinesMapA, (klines) => klines.slice(-Z_SCORE_CANDLE_LIMIT)),
    R.mapValues(timeframeKlinesMapB, (klines) => klines.slice(-Z_SCORE_CANDLE_LIMIT)),
  );
  const multipleTimeframeZScoreHistory = zScore.calculateMultipleTimeframeZScoreHistory(
    timeframeKlinesMapA,
    timeframeKlinesMapB,
  );

  // Выполнение теста Энгла-Грейнджера для проверки коинтеграции
  const engleGrangerTest = new EngleGrangerTest();
  const multipleTimeframeCointegration = engleGrangerTest.calculateMultipleTimeframeCointegration(
    R.mapValues(timeframeKlinesMapA, (klines) => klines.slice(-COINTEGRATION_CANDLE_LIMIT)),
    R.mapValues(timeframeKlinesMapB, (klines) => klines.slice(-COINTEGRATION_CANDLE_LIMIT)),
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
    await getAssetKlines(symbolA, timeframe, 100);
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

      const [timeframeKlinesA, timeframeKlinesB] = await Promise.all([
        getAssetKlines(symbolA, timeframe, Z_SCORE_CANDLE_LIMIT),
        getAssetKlines(symbolB, timeframe, Z_SCORE_CANDLE_LIMIT),
      ]);

      result[pair] = zScore.calculateZScore(timeframeKlinesA, timeframeKlinesB);
    }
  }

  return result;
};
