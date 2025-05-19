import fs from 'fs';
import path from 'path';
import * as R from 'remeda';

import { TTimeframe } from '../../../../trading/types';
import { TExchangeInfoSymbol } from '../../../../trading/providers/Binance/BinanceHTTPClient';
import { getAssetList, getAssetKlines } from '../assetService';
import { TAsset } from '../assetService/types';
import { TCorrelationReport, TCorrelationReportRecord } from './types';
import { getPairCorrelation } from './pair';

const reportPath = path.resolve(__dirname, '../../../../../data/correlationReport.json');

export const hasCorrelationReport = () => {
  return fs.existsSync(reportPath);
};

export const getCorrelationReport = async () => {
  if (fs.existsSync(reportPath)) {
    return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  }

  return null;
};

const serializePairName = (tickerA: string, tickerB: string) => `${tickerA}-${tickerB}`;

export const buildCorrelationReport = async () => {
  const assets: TExchangeInfoSymbol[] = await getAssetList();
  const assetTickers = assets.map((asset) => asset.symbol);

  const timeframe: TTimeframe = '1h';
  const candleLimit = 1000;

  const report: TCorrelationReport = {};

  const tickerChunks = R.chunk(assetTickers, 10);

  const chunkCount = tickerChunks.length;
  let currentChunk = 0;

  for await (const chunk of tickerChunks) {
    currentChunk++;

    await Promise.all(chunk.map((ticker) => getAssetKlines(ticker, timeframe, candleLimit)));

    console.log(`Chunk processed: ${currentChunk}/${chunkCount}`);
  }

  for await (const tickerA of assetTickers) {
    for await (const tickerB of assetTickers) {
      if (tickerA === tickerB) {
        report[serializePairName(tickerA, tickerB)] = null;
        continue;
      }

      if (report[serializePairName(tickerB, tickerA)]) {
        report[serializePairName(tickerA, tickerB)] = report[serializePairName(tickerB, tickerA)];
        continue;
      }

      const correlation = await getPairCorrelation(tickerA, tickerB, {
        timeframes: [timeframe],
      });

      report[serializePairName(tickerA, tickerB)] = correlation.correlation[timeframe];
    }

    console.log(`${tickerA} done`);
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
};

const buildCompleteGraphs = (edges: string[]) => {
  // Создаём карту смежности
  const adjacencyMap = new Map<string, Set<string>>();

  // Заполняем карту смежности
  edges.forEach((edge) => {
    const [first, second] = edge.split('-');

    if (!adjacencyMap.has(first)) {
      adjacencyMap.set(first, new Set());
    }
    if (!adjacencyMap.has(second)) {
      adjacencyMap.set(second, new Set());
    }

    adjacencyMap.get(first)!.add(second);
    adjacencyMap.get(second)!.add(first);
  });

  const visited = new Set<string>();
  const completeGraphs: string[][] = [];

  // Для каждой вершины находим полносвязный граф, в котором она участвует
  for (const vertex of adjacencyMap.keys()) {
    if (visited.has(vertex)) continue;

    // Начинаем с текущей вершины
    const potentialClique = [vertex];
    const neighbors = Array.from(adjacencyMap.get(vertex) || []);

    // Проверяем каждого соседа
    for (const neighbor of neighbors) {
      // Проверяем, связан ли сосед со всеми вершинами в потенциальном клике
      let isComplete = true;
      for (const cliqueVertex of potentialClique) {
        if (!adjacencyMap.get(neighbor)?.has(cliqueVertex)) {
          isComplete = false;
          break;
        }
      }

      if (isComplete) {
        potentialClique.push(neighbor);
      }
    }

    // Если нашли клику размером больше 1, добавляем её
    if (potentialClique.length > 1) {
      completeGraphs.push(potentialClique);
      potentialClique.forEach((v) => visited.add(v));
    }
  }

  return completeGraphs;
};

const CACHE_DIR = path.resolve(process.cwd(), 'data');

const getCacheFilePath = (cacheKey: string) => {
  return path.join(CACHE_DIR, `correlationReportClusters_${cacheKey}.json`);
};

export const getCorrelationReportClusters = async (
  usdtOnly: boolean,
  minCorrelation: number,
  minVolume: number,
) => {
  const cacheKey = `${usdtOnly}_${minCorrelation}_${minVolume}`;

  const cacheFilePath = getCacheFilePath(cacheKey);

  try {
    if (fs.existsSync(cacheFilePath)) {
      return JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading cache file:', error);
  }

  const assetList: TAsset[] = await getAssetList();
  const report = await getCorrelationReport();

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
