import path from 'path';
import fs from 'fs';
import * as R from 'remeda';
import { Op } from 'sequelize';

import { buildCompleteGraphs } from '../utils/graph';
import {
  TTimeframe,
  TCorrelationReportMapEntry,
  TCorrelationReportFilters,
  TCorrelationReportMap,
} from '../../shared/types';
import { EngleGrangerTest } from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { TIndicatorCandle } from '../trading/indicators/types';
import { HalfLife } from '../trading/indicators/HalfLife/HalfLife';
import BinanceHTTPClient, { TCandle } from '../trading/providers/Binance/BinanceHTTPClient';
import { Candle } from '../models/Candle';
import { Asset } from '../models/Asset';

const CANDLE_LIMIT = 500;

const correlationReportFolder = path.resolve(process.cwd(), 'data', 'correlationReport');
const correlationReportFilePath = (timeframe: TTimeframe) =>
  path.join(correlationReportFolder, `report_${timeframe}.json`);

const findCandles = async (
  symbol: string,
  timeframe: TTimeframe,
  date: number,
  limit: number,
): Promise<TIndicatorCandle[]> => {
  const candles = await Candle.findAll({
    where: {
      symbol,
      timeframe,
      openTime: {
        [Op.lte]: date,
      },
    },
    order: [['openTime', 'DESC']],
    limit,
  });

  return candles.reverse().map((candle) => ({
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
  return fs.existsSync(correlationReportFilePath(timeframe));
};

const getReport = async (timeframe: TTimeframe) => {
  if (!fs.existsSync(correlationReportFilePath(timeframe))) {
    return null;
  }

  const reportContent = fs.readFileSync(correlationReportFilePath(timeframe), 'utf-8');

  return JSON.parse(reportContent) as TCorrelationReportMap;
};

const filterReport = async (report: TCorrelationReportMap, filters: TCorrelationReportFilters) => {
  const assetList = await Asset.findAll();
  const assetMap = R.indexBy(assetList, (asset) => asset.symbol);

  const { usdtOnly, ignoreUsdtUsdc, maxPValue, maxHalfLife, minVolume } = filters;

  const filteredReport = R.pipe(
    R.entries<TCorrelationReportMap>(report),
    R.filter(
      (entry): entry is [string, NonNullable<TCorrelationReportMapEntry>] => entry[1] !== null,
    ),
    R.map(([pair, correlation]) => ({
      pair,
      pValue: correlation.pValue,
      halfLife: correlation.halfLife,
    })),
    R.filter((item) => {
      const [firstPair, secondPair] = item.pair.split('-');
      if (usdtOnly) {
        return firstPair.endsWith('USDT') && secondPair.endsWith('USDT');
      }
      return true;
    }),
    R.filter((item) => {
      const [firstPair, secondPair] = item.pair.split('-');

      if (ignoreUsdtUsdc) {
        if (
          (firstPair.endsWith('USDT') && secondPair.endsWith('USDC')) ||
          (firstPair.endsWith('USDC') && secondPair.endsWith('USDT'))
        ) {
          return false;
        }
      }

      return true;
    }),
    R.filter((item) => item.pValue <= maxPValue),
    R.filter((item) => {
      if (item.halfLife) {
        return item.halfLife <= maxHalfLife;
      }
      return false;
    }),
    R.filter((item) => {
      const [symbolA, symbolB] = item.pair.split('-');
      const assetA = assetMap[symbolA];
      const assetB = assetMap[symbolB];

      return Number(assetA.usdtVolume) >= minVolume && Number(assetB.usdtVolume) >= minVolume;
    }),
  );

  return R.fromEntries(
    filteredReport.map(
      (item) =>
        [item.pair, R.pick(item, ['pValue', 'halfLife'])] as [string, TCorrelationReportMapEntry],
    ),
  );
};

export const getReportList = async (timeframe: TTimeframe, filters: TCorrelationReportFilters) => {
  const report = await getReport(timeframe);

  if (!report) {
    return null;
  }

  const { usdtOnly, ignoreUsdtUsdc, maxPValue, maxHalfLife, minVolume } = filters;

  const cacheKey = `${usdtOnly}_${ignoreUsdtUsdc}_${maxPValue}_${maxHalfLife}_${minVolume}`;
  const cacheFilePath = path.join(
    path.resolve(correlationReportFolder, `report_${timeframe}_list_${cacheKey}.json`),
  );

  try {
    if (fs.existsSync(cacheFilePath)) {
      return JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading cache file:', error);
  }

  const filteredReport = await filterReport(report, filters);

  const result = R.pipe(
    R.entries<TCorrelationReportMap>(filteredReport),
    R.filter(
      (entry): entry is [string, NonNullable<TCorrelationReportMapEntry>] => entry[1] !== null,
    ),
    R.map(([pair, correlation]) => ({
      pair,
      pValue: correlation.pValue,
      halfLife: correlation.halfLife,
    })),
    R.sort((a, b) => {
      // Первый приоритет: halfLife (по возрастанию)
      if (a.halfLife === null && b.halfLife === null) {
        // Если оба Infinity, сортируем по pValue
        return Math.abs(a.pValue) - Math.abs(b.pValue);
      }
      if (a.halfLife === null) return 1;
      if (b.halfLife === null) return -1;

      // Если halfLife одинаковые (или очень близкие), сортируем по pValue
      const halfLifeDiff = a.halfLife - b.halfLife;
      if (Math.abs(halfLifeDiff) < 0.01) {
        // считаем одинаковыми если разница < 0.01
        return Math.abs(a.pValue) - Math.abs(b.pValue);
      }

      return halfLifeDiff;
    }),
  );

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(result), 'utf-8');
  } catch (error) {
    console.error('Error writing cache file:', error);
  }

  return result;
};

export const getReportMap = async (timeframe: TTimeframe, filters: TCorrelationReportFilters) => {
  const report = await getReport(timeframe);

  if (!report) {
    return null;
  }

  return filterReport(report, filters);
};

export const buildReport = async (timeframe: TTimeframe, date: number) => {
  const assets = await Asset.findAll();
  const assetTickers = assets.map((asset) => asset.symbol);

  const report: Map<string, TCorrelationReportMapEntry> = new Map();

  await Candle.sync();

  const binanceHttpClient = BinanceHTTPClient.getInstance();

  await Promise.all(
    assetTickers.map(async (symbol) => {
      const candles = await binanceHttpClient.fetchAssetCandles(
        symbol,
        timeframe,
        CANDLE_LIMIT,
        undefined,
        date,
      );

      const candlesWithMetadata: (TCandle & { symbol: string; timeframe: string })[] = candles.map(
        (candle) => ({
          ...candle,
          symbol,
          timeframe,
        }),
      );

      return Candle.bulkCreate(candlesWithMetadata, { ignoreDuplicates: true });
    }),
  );

  const candlesCache = new Map<string, TIndicatorCandle[]>();

  for (const ticker of assetTickers) {
    const candles = await findCandles(ticker, timeframe, date, CANDLE_LIMIT);
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

      const pricesA = candlesA.map((candle) => candle.close);
      const pricesB = candlesB.map((candle) => candle.close);

      const halfLife = new HalfLife();
      const halfLifeValue = halfLife.calculate(pricesA, pricesB);

      report.set(serializePairName(tickerA, tickerB), {
        pValue: cointegration.pValue,
        halfLife: halfLifeValue,
      });
    }

    counter++;

    console.log(`${((counter / assetTickers.length) * 100).toFixed(2)}% processed`);
  }

  const cacheDir = correlationReportFolder;
  const listCachePrefix = `report_${timeframe}_list_`;
  const clusterCachePrefix = `report_${timeframe}_clusters_`;

  try {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
      if (
        (file.startsWith(listCachePrefix) && file.endsWith('.json')) ||
        (file.startsWith(clusterCachePrefix) && file.endsWith('.json'))
      ) {
        fs.unlinkSync(path.join(cacheDir, file));
      }
    }
    console.log(`Старые кеш-файлы для таймфрейма ${timeframe} удалены`);
  } catch (err) {
    console.error('Ошибка при удалении кеш-файлов кластеров:', err);
  }

  fs.writeFileSync(
    correlationReportFilePath(timeframe),
    JSON.stringify(Object.fromEntries(report), null, 2),
  );

  console.log(`Report built in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);

  return report;
};

export const getReportClusters = async (
  timeframe: TTimeframe,
  filters: TCorrelationReportFilters,
) => {
  const { usdtOnly, ignoreUsdtUsdc, maxPValue, maxHalfLife, minVolume } = filters;

  const cacheKey = `${usdtOnly}_${ignoreUsdtUsdc}_${maxPValue}_${maxHalfLife}_${minVolume}`;
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
  const report = await getReport(timeframe);

  if (!report) {
    return null;
  }

  const reverseReport = R.mapKeys(report, (key) => key.split('-').reverse().join('-'));
  const fullReport = { ...report, ...reverseReport };

  const assetMap = R.indexBy(assetList, (asset) => asset.symbol);
  const processedPairs = new Set<string>();

  const correlationEdges = R.pipe(
    R.entries<TCorrelationReportMap>(fullReport),
    R.filter(
      (
        entry: [string, TCorrelationReportMapEntry],
      ): entry is [string, NonNullable<TCorrelationReportMapEntry>] => Boolean(entry[1]),
    ),
    R.filter(([key]) => {
      const [firstPair, secondPair] = key.split('-');

      if (usdtOnly) {
        return firstPair.endsWith('USDT') && secondPair.endsWith('USDT');
      }

      return true;
    }),
    R.filter(([key]) => {
      const [firstPair, secondPair] = key.split('-');

      if (ignoreUsdtUsdc) {
        if (
          (firstPair.endsWith('USDT') && secondPair.endsWith('USDC')) ||
          (firstPair.endsWith('USDC') && secondPair.endsWith('USDT'))
        ) {
          return false;
        }
      }

      return true;
    }),
    R.filter(([key]) => {
      const [first, second] = key.split('-');

      const firstAsset = assetMap[first];
      const secondAsset = assetMap[second];

      if (!firstAsset || !secondAsset) {
        return false;
      }

      return (
        Number(firstAsset.usdtVolume) > minVolume || Number(secondAsset.usdtVolume) > minVolume
      );
    }),
    R.filter(([, { pValue }]) => pValue <= maxPValue),
    R.filter(([key, { halfLife }]) => {
      const [first, second] = key.split('-');

      const firstAsset = assetMap[first];
      const secondAsset = assetMap[second];

      if (!firstAsset || !secondAsset) {
        return false;
      }

      return halfLife <= maxHalfLife;
    }),
    R.sort(([, a], [, b]) => b.pValue - a.pValue),
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
