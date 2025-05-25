import fs from 'fs';
import path from 'path';
import * as R from 'remeda';

import { buildCompleteGraphs } from '../utils/graph';
import { TTimeframe, TCorrelationReport, TCorrelationReportRecord } from '../../shared/types';
import { PearsonCorrelation } from '../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { ZScore } from '../trading/indicators/ZScore/ZScore';
import {
  TCointegrationResult,
  EngleGrangerTest,
} from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { Candle } from '../models/Candle';
import { Asset } from '../models/Asset';

const CANDLE_LIMIT = 1000;

const PEARSON_CANDLE_LIMIT = 500;
const Z_SCORE_CANDLE_LIMIT = 100;
const COINTEGRATION_CANDLE_LIMIT = 500;

const correlationReportPath = path.resolve(process.cwd(), 'data', 'correlationReport.json');

const findCandles = (symbol: string, timeframe: TTimeframe, limit: number) => {
  return Candle.findAll({
    where: {
      symbol,
      timeframe,
    },
    limit,
  });
};

export const getPairCorrelation = async (symbolA: string, symbolB: string) => {
  const timeframes: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  const pearsonCorrelation = new PearsonCorrelation();

  const multipleTimeframeCorrelation = {} as Record<TTimeframe, number>;
  for (const timeframe of timeframes) {
    const [candlesA, candlesB] = await Promise.all([
      findCandles(symbolA, timeframe, PEARSON_CANDLE_LIMIT),
      findCandles(symbolB, timeframe, PEARSON_CANDLE_LIMIT),
    ]);

    multipleTimeframeCorrelation[timeframe] = pearsonCorrelation.calculateCorrelation(
      candlesA,
      candlesB,
    );
  }

  const multipleTimeframeCorrelationRolling = {} as Record<
    TTimeframe,
    { timestamp: number; value: number }[]
  >;
  for (const timeframe of timeframes) {
    const [candlesA, candlesB] = await Promise.all([
      findCandles(symbolA, timeframe, CANDLE_LIMIT),
      findCandles(symbolB, timeframe, CANDLE_LIMIT),
    ]);

    multipleTimeframeCorrelationRolling[timeframe] = pearsonCorrelation.calculateCorrelationRolling(
      candlesA,
      candlesB,
    );
  }

  const zScore = new ZScore();

  const multipleTimeframeZScore = {} as Record<TTimeframe, number>;
  for (const timeframe of timeframes) {
    const [candlesA, candlesB] = await Promise.all([
      findCandles(symbolA, timeframe, Z_SCORE_CANDLE_LIMIT),
      findCandles(symbolB, timeframe, Z_SCORE_CANDLE_LIMIT),
    ]);

    multipleTimeframeZScore[timeframe] = zScore.calculateZScore(candlesA, candlesB);
  }

  const multipleTimeframeZScoreRolling = {} as Record<
    TTimeframe,
    { timestamp: number; value: number }[]
  >;
  for (const timeframe of timeframes) {
    const [candlesA, candlesB] = await Promise.all([
      findCandles(symbolA, timeframe, CANDLE_LIMIT),
      findCandles(symbolB, timeframe, CANDLE_LIMIT),
    ]);

    multipleTimeframeZScoreRolling[timeframe] = zScore.calculateZScoreRolling(candlesA, candlesB);
  }

  const engleGrangerTest = new EngleGrangerTest();

  const multipleTimeframeCointegration = {} as Record<TTimeframe, TCointegrationResult>;
  for (const timeframe of timeframes) {
    const [candlesA, candlesB] = await Promise.all([
      findCandles(symbolA, timeframe, COINTEGRATION_CANDLE_LIMIT),
      findCandles(symbolB, timeframe, COINTEGRATION_CANDLE_LIMIT),
    ]);

    multipleTimeframeCointegration[timeframe] = engleGrangerTest.calculateCointegration(
      candlesA,
      candlesB,
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

  const cache = new Map<string, Candle[]>();

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

      result[pair] = zScore.calculateZScore(candlesA, candlesB);
    }
  }

  return result;
};

export const hasCorrelationReport = () => {
  return fs.existsSync(correlationReportPath);
};

export const getCorrelationReport = () => {
  if (fs.existsSync(correlationReportPath)) {
    return JSON.parse(fs.readFileSync(correlationReportPath, 'utf-8'));
  }

  return null;
};

export const buildCorrelationReport = async () => {
  const assets = await Asset.findAll();
  const assetTickers = assets.map((asset) => asset.symbol);

  const timeframe: TTimeframe = '1m';
  const report: TCorrelationReport = {};

  const cache = new Map<string, Candle[]>();

  const REPORT_CANDLE_LIMIT = 1000;

  const serializePairName = (tickerA: string, tickerB: string) => `${tickerA}-${tickerB}`;

  let counter = 0;

  const startTime = Date.now();

  for (const tickerA of assetTickers) {
    let candlesA = cache.get(tickerA);
    if (!candlesA) {
      candlesA = await Candle.findAll({
        where: {
          symbol: tickerA,
          timeframe,
        },
        limit: REPORT_CANDLE_LIMIT,
      });

      cache.set(tickerA, candlesA);
    }

    for (const tickerB of assetTickers) {
      if (tickerA === tickerB) {
        report[serializePairName(tickerA, tickerB)] = null;
        continue;
      }

      if (report[serializePairName(tickerB, tickerA)]) {
        report[serializePairName(tickerA, tickerB)] = report[serializePairName(tickerB, tickerA)];
        continue;
      }

      let candlesB = cache.get(tickerB);
      if (!candlesB) {
        candlesB = await Candle.findAll({
          where: {
            symbol: tickerB,
            timeframe,
          },
          limit: REPORT_CANDLE_LIMIT,
        });
        cache.set(tickerB, candlesB);
      }

      const pearsonCorrelation = new PearsonCorrelation();
      const correlation = pearsonCorrelation.calculateCorrelation(candlesA, candlesB);

      report[serializePairName(tickerA, tickerB)] = correlation;
    }

    counter++;

    console.log(`${((counter / assetTickers.length) * 100).toFixed(2)}% processed`);
  }

  fs.writeFileSync(correlationReportPath, JSON.stringify(report, null, 2));

  console.log(`Report built in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);

  return report;
};

export const getCorrelationReportClusters = async (
  usdtOnly: boolean,
  minCorrelation: number,
  minVolume: number,
) => {
  const cacheKey = `${usdtOnly}_${minCorrelation}_${minVolume}`;
  const cacheFilePath = path.join(
    path.resolve(process.cwd(), 'data'),
    `correlationReportClusters_${cacheKey}.json`,
  );

  try {
    if (fs.existsSync(cacheFilePath)) {
      return JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading cache file:', error);
  }

  const assetList = await Asset.findAll();
  const report = getCorrelationReport();

  const assetMap = R.indexBy(assetList, (asset) => asset.symbol);
  const processedPairs = new Set<string>();

  const correlationEdges = R.pipe(
    report,
    R.entries,
    R.filter(
      (
        entry: [string, TCorrelationReportRecord],
      ): entry is [string, NonNullable<TCorrelationReportRecord>] => Boolean(entry[1]),
    ),
    R.filter(([key]) => {
      const [firstPair, secondPair] = key.split('-');

      if (usdtOnly) {
        return firstPair.endsWith('USDT') && secondPair.endsWith('USDT');
      }

      return true;
    }),
    R.filter(([key, correlationRecord]) => {
      const [first, second] = key.split('-');

      const firstAsset = assetMap[first];
      const secondAsset = assetMap[second];

      if (!firstAsset || !secondAsset) {
        return false;
      }

      return (
        (firstAsset.usdtVolume > minVolume || secondAsset.usdtVolume > minVolume) &&
        correlationRecord > minCorrelation
      );
    }),
    R.sort(([, a], [, b]) => b - a),
    R.filter(([key]) => {
      const [first, second] = key.split('-');
      const reversePair = `${second}-${first}`;

      if (processedPairs.has(reversePair)) {
        return false;
      }

      processedPairs.add(key);
      return true;
    }),
    R.map(([key]) => key),
  );

  const result = buildCompleteGraphs(correlationEdges);

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(result), 'utf-8');
  } catch (error) {
    console.error('Error writing cache file:', error);
  }

  return result;
};
