import fs from 'fs';
import path from 'path';
import * as R from 'remeda';

import { PearsonCorrelation } from '../../../../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { TCandle, TTimeframe } from '../../../../trading/types';
import { TCorrelationReport, TCorrelationReportRecord } from './types';
import { AssetRepository } from '../../repositories/AssetRepository';
import { CandleRepository } from '../../repositories/CandleRepository';

const reportPath = path.resolve(__dirname, '../../../../../data/correlationReport.json');

const assetRepository = AssetRepository.getInstance();
const candleRepository = CandleRepository.getInstance();

export const hasCorrelationReport = () => {
  return fs.existsSync(reportPath);
};

export const getCorrelationReport = () => {
  if (fs.existsSync(reportPath)) {
    return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  }

  return null;
};

export const buildCorrelationReport = async () => {
  const assets = assetRepository.getAssets();
  const assetTickers = assets.map((asset) => asset.symbol);

  const timeframe: TTimeframe = '1m';
  const report: TCorrelationReport = {};

  const cache = new Map<string, TCandle[]>();

  const REPORT_CANDLE_LIMIT = 1000;

  const serializePairName = (tickerA: string, tickerB: string) => `${tickerA}-${tickerB}`;

  let counter = 0;

  const startTime = Date.now();

  for (const tickerA of assetTickers) {
    const candlesA =
      cache.get(tickerA) || candleRepository.getCandles(tickerA, timeframe, REPORT_CANDLE_LIMIT);
    cache.set(tickerA, candlesA);

    for (const tickerB of assetTickers) {
      const candlesB =
        cache.get(tickerB) || candleRepository.getCandles(tickerB, timeframe, REPORT_CANDLE_LIMIT);
      cache.set(tickerB, candlesB);

      if (tickerA === tickerB) {
        report[serializePairName(tickerA, tickerB)] = null;
        continue;
      }

      if (report[serializePairName(tickerB, tickerA)]) {
        report[serializePairName(tickerA, tickerB)] = report[serializePairName(tickerB, tickerA)];
        continue;
      }

      const pearsonCorrelation = new PearsonCorrelation();
      const correlation = pearsonCorrelation.calculateCorrelation(candlesA, candlesB);

      report[serializePairName(tickerA, tickerB)] = correlation;
    }

    counter++;

    console.log(`${((counter / assetTickers.length) * 100).toFixed(2)}% processed`);
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Report built in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);

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

  const assetList = assetRepository.getAssets();
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
