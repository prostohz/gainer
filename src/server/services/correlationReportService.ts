import fs from 'fs';
import path from 'path';
import * as R from 'remeda';

import { buildCompleteGraphs } from '../utils/graph';
import { TTimeframe, TCorrelationReport, TCorrelationReportRecord } from '../../shared/types';
import { EngleGrangerTest } from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { TIndicatorCandle } from '../trading/indicators/types';
import { Candle } from '../models/Candle';
import { Asset } from '../models/Asset';

const correlationReportFolder = path.resolve(process.cwd(), 'data', 'correlationReport');

const CANDLE_LIMIT = 500;

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

export const hasReport = (timeframe: TTimeframe) => {
  return fs.existsSync(path.join(correlationReportFolder, `report_${timeframe}.json`));
};

export const getReport = (timeframe: TTimeframe): TCorrelationReport | null => {
  if (fs.existsSync(path.join(correlationReportFolder, `report_${timeframe}.json`))) {
    return JSON.parse(
      fs.readFileSync(path.join(correlationReportFolder, `report_${timeframe}.json`), 'utf-8'),
    );
  }

  return null;
};

export const buildReport = async (timeframe: TTimeframe) => {
  const assets = await Asset.findAll();
  const assetTickers = assets.map((asset) => asset.symbol);

  const report: Map<string, number> = new Map();

  const candlesCache = new Map<string, TIndicatorCandle[]>();

  for (const ticker of assetTickers) {
    const candles = await findCandles(ticker, timeframe, CANDLE_LIMIT);
    candlesCache.set(ticker, candles);
  }

  const serializePairName = (tickerA: string, tickerB: string) => `${tickerA}-${tickerB}`;

  let counter = 0;

  const startTime = Date.now();

  for (const tickerA of assetTickers) {
    for (const tickerB of assetTickers) {
      if (tickerA === tickerB) {
        continue;
      }

      if (tickerA === tickerB) {
        continue;
      }

      if (report.has(serializePairName(tickerB, tickerA))) {
        continue;
      }

      const candlesA = candlesCache.get(tickerA)!;
      const candlesB = candlesCache.get(tickerB)!;

      if (candlesA.length < CANDLE_LIMIT || candlesB.length < CANDLE_LIMIT) {
        continue;
      }

      const engleGrangerTest = new EngleGrangerTest();
      const cointegration = engleGrangerTest.calculateCointegration(candlesA, candlesB);

      report.set(serializePairName(tickerA, tickerB), cointegration.pValue);
    }

    counter++;

    console.log(`${((counter / assetTickers.length) * 100).toFixed(2)}% processed`);
  }

  fs.writeFileSync(
    path.join(correlationReportFolder, `report_${timeframe}.json`),
    JSON.stringify(Object.fromEntries(report), null, 2),
  );

  console.log(`Report built in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);

  return report;
};

export const getReportClusters = async (
  timeframe: TTimeframe,
  usdtOnly: boolean,
  maxPValue: number,
  minVolume: number,
) => {
  const cacheKey = `${usdtOnly}_${maxPValue}_${minVolume}`;
  const cacheFilePath = path.join(
    path.resolve(correlationReportFolder, `report_${timeframe}_clusters_${cacheKey}.json`),
  );

  try {
    if (fs.existsSync(cacheFilePath)) {
      return JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading cache file:', error);
  }

  const assetList = await Asset.findAll();
  const report = getReport(timeframe);

  if (!report) {
    return null;
  }

  const reverseReport = R.mapKeys(report, (key) => key.split('-').reverse().join('-'));
  const fullReport = { ...report, ...reverseReport };

  const assetMap = R.indexBy(assetList, (asset) => asset.symbol);
  const processedPairs = new Set<string>();

  const correlationEdges = R.pipe(
    fullReport,
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
        (Number(firstAsset.usdtVolume) > minVolume || Number(secondAsset.usdtVolume) > minVolume) &&
        correlationRecord <= maxPValue
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
