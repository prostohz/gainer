import path from 'path';
import fs from 'fs';
import * as R from 'remeda';
import { Op } from 'sequelize';
import { mean, std, median } from 'mathjs';

import { dayjs } from '../../shared/utils/daytime';
import { TTimeframe, TPairReport, TPairReportEntry } from '../../shared/types';
import { timeframeToMilliseconds } from '../utils/timeframe';
import { measureTime } from '../utils/performance';
import { Asset } from '../models/Asset';
import { Candle } from '../models/Candle';
import { run } from '../trading/strategies/MeanReversionStrategy/backtest';
import { PearsonCorrelation } from '../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { BetaHedge } from '../trading/indicators/BetaHedge/BetaHedge';
import { EngleGrangerTest } from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { TIndicatorCandle } from '../trading/indicators/types';
import { HalfLife } from '../trading/indicators/HalfLife/HalfLife';
import { HurstExponent } from '../trading/indicators/HurstExponent/HurstExponent';

const MIN_USDT_VOLUME = 1_000_000;

const ONE_MINUTE_CANDLE_COUNT = 1440;
const FIVE_MINUTE_CANDLE_COUNT = 1440;

const CANDLE_COUNT_FOR_CORRELATION = 90;
const CANDLE_COUNT_FOR_CORRELATION_ROLLING = 300;
const CANDLE_COUNT_FOR_COINTEGRATION = 1200;
const CANDLE_COUNT_FOR_HURST_EXPONENT = 1200;
const CANDLE_COUNT_FOR_HALF_LIFE = 600;
const CANDLE_COUNT_FOR_SPREAD = 120;

const MIN_CORRELATION_BY_PRICES = 0.5;
const MAX_CORRELATION_BY_PRICES = 0.99;
const MIN_CORRELATION_BY_RETURNS = 0.3;
const MAX_CORRELATION_BY_RETURNS = 0.99;

const MIN_ROLLING_CORRELATION_BY_RETURNS_MEAN = 0.35;
const MIN_ROLLING_CORRELATION_BY_RETURNS_THRESHOLD = 0.2;
const MIN_ROLLING_CORRELATION_BY_RETURNS_RATIO = 0.7;

const MAX_COINTEGRATION_P_VALUE = 0.01;

const MAX_HURST_EXPONENT = 0.5;

const MIN_HALF_LIFE_DURATION_MS = 5 * 60 * 1000;
const MAX_HALF_LIFE_DURATION_MS = 30 * 60 * 1000;

const pairReportFolder = path.resolve(process.cwd(), 'data', 'pairReports');
const pairReportMetaDataFilePath = (id: string) => path.join(pairReportFolder, id, 'report.json');
const pairReportDataFilePath = (id: string) => path.join(pairReportFolder, id, 'data.json');
const pairReportBacktestFilePath = (id: string) => path.join(pairReportFolder, id, 'backtest.json');

// Статистика времени выполнения функций check*
interface PerformanceStats {
  totalTime: number;
  calls: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
}

const performanceStats: Record<string, PerformanceStats> = {};

const measureCheckTime = <T extends unknown[], R>(funcName: string, fn: (...args: T) => R) => {
  return (...args: T): R => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();

    const duration = end - start;

    if (!performanceStats[funcName]) {
      performanceStats[funcName] = {
        totalTime: 0,
        calls: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
      };
    }

    const stats = performanceStats[funcName];
    stats.totalTime += duration;
    stats.calls += 1;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.avgTime = stats.totalTime / stats.calls;

    return result;
  };
};

const printPerformanceStats = () => {
  console.log('\n=== СТАТИСТИКА ВРЕМЕНИ ВЫПОЛНЕНИЯ ФУНКЦИЙ CHECK* ===');
  console.log(
    '┌─────────────────────────┬──────────┬─────────────┬─────────────┬─────────────┬─────────────┐',
  );
  console.log(
    '│ Функция                 │ Вызовов  │ Общее (мс)  │ Мин (мс)    │ Макс (мс)   │ Сред (мс)   │',
  );
  console.log(
    '├─────────────────────────┼──────────┼─────────────┼─────────────┼─────────────┼─────────────┤',
  );

  for (const [funcName, stats] of Object.entries(performanceStats)) {
    const name = funcName.padEnd(23);
    const calls = stats.calls.toString().padStart(8);
    const total = stats.totalTime.toFixed(2).padStart(11);
    const min = stats.minTime.toFixed(2).padStart(11);
    const max = stats.maxTime.toFixed(2).padStart(11);
    const avg = stats.avgTime.toFixed(2).padStart(11);

    console.log(`│ ${name} │ ${calls} │ ${total} │ ${min} │ ${max} │ ${avg} │`);
  }

  console.log(
    '└─────────────────────────┴──────────┴─────────────┴─────────────┴─────────────┴─────────────┘',
  );

  const totalTime = Object.values(performanceStats).reduce(
    (sum, stats) => sum + stats.totalTime,
    0,
  );
  const totalCalls = Object.values(performanceStats).reduce((sum, stats) => sum + stats.calls, 0);

  console.log(`\nИтого: ${totalCalls} вызовов, ${totalTime.toFixed(2)} мс общего времени`);

  // Очищаем статистику для следующего запуска
  Object.keys(performanceStats).forEach((key) => delete performanceStats[key]);
};

export const getReportList = async () => {
  const entries = fs.readdirSync(pairReportFolder);

  return entries
    .filter((entry) => {
      const stat = fs.statSync(path.join(pairReportFolder, entry));
      return stat.isDirectory();
    })
    .map((entry) => {
      const reportMetaData = fs.readFileSync(
        path.join(pairReportFolder, entry, 'report.json'),
        'utf-8',
      );
      const reportData = fs.readFileSync(path.join(pairReportFolder, entry, 'data.json'), 'utf-8');

      const reportMetaDataJSON = JSON.parse(reportMetaData) as Pick<TPairReport, 'id' | 'date'>;
      const reportDataJSON = JSON.parse(reportData) as TPairReport['data'];
      const backtest = fs.existsSync(pairReportBacktestFilePath(entry))
        ? JSON.parse(fs.readFileSync(pairReportBacktestFilePath(entry), 'utf-8'))
        : null;

      return {
        id: reportMetaDataJSON.id,
        date: reportMetaDataJSON.date,
        data: reportDataJSON,
        backtest,
      };
    });
};

export const createReport = measureTime('Report creation', async (date: number) => {
  console.log('Creating report for', dayjs(date).format('DD.MM HH:mm:ss'));

  const id = `${date}`;

  const assets = await Asset.findAll();
  const assetsWithVolume = assets.filter((asset) => Number(asset.usdtVolume) > MIN_USDT_VOLUME);

  console.log('Assets with volume', assetsWithVolume.length);
  console.log('Pairs to process', (assetsWithVolume.length * (assetsWithVolume.length - 1)) / 2);

  const report: Map<string, TPairReportEntry | null> = new Map();

  const oneMinuteCandlesCache = await getOneMinuteCandlesCache(assetsWithVolume, date);
  const fiveMinuteCandlesCache = await getFiveMinuteCandlesCache(assetsWithVolume, date);

  const serializePairName = (tickerA: string, tickerB: string) =>
    [tickerA, tickerB].sort().join('-');

  for (let i = 0; i < assetsWithVolume.length; i++) {
    for (let j = i + 1; j < assetsWithVolume.length; j++) {
      const assetA = assetsWithVolume[i];
      const assetB = assetsWithVolume[j];

      const pairName = serializePairName(assetA.symbol, assetB.symbol);

      try {
        const oneMinuteCandlesA = oneMinuteCandlesCache.get(assetA.symbol)!;
        const oneMinuteCandlesB = oneMinuteCandlesCache.get(assetB.symbol)!;

        const fiveMinuteCandlesA = fiveMinuteCandlesCache.get(assetA.symbol)!;
        const fiveMinuteCandlesB = fiveMinuteCandlesCache.get(assetB.symbol)!;

        if (oneMinuteCandlesA.length === 0 || oneMinuteCandlesB.length === 0) {
          report.set(pairName, null);
          continue;
        }

        const correlation = checkCorrelation(oneMinuteCandlesA, oneMinuteCandlesB);
        if (!correlation) {
          report.set(pairName, null);
          continue;
        }

        const halfLife = checkHalfLife(oneMinuteCandlesA, oneMinuteCandlesB);
        if (!halfLife) {
          report.set(pairName, null);
          continue;
        }

        const oneMinuteCointegration = checkCointegration(oneMinuteCandlesA, oneMinuteCandlesB);
        if (!oneMinuteCointegration) {
          report.set(pairName, null);
          continue;
        }

        const fiveMinuteCointegration = checkCointegration(fiveMinuteCandlesA, fiveMinuteCandlesB);
        if (!fiveMinuteCointegration) {
          report.set(pairName, null);
          continue;
        }

        if (!checkRollingCorrelation(oneMinuteCandlesA, oneMinuteCandlesB)) {
          report.set(pairName, null);
          continue;
        }

        const hurstExponent = checkHurstExponent(oneMinuteCandlesA, oneMinuteCandlesB);
        if (!hurstExponent) {
          report.set(pairName, null);
          continue;
        }

        const beta = checkBetaHedge(oneMinuteCandlesA, oneMinuteCandlesB);
        if (!beta) {
          report.set(pairName, null);
          continue;
        }

        const crossings = checkCrossings(oneMinuteCandlesA, oneMinuteCandlesB, beta);
        if (crossings === 0) {
          report.set(pairName, null);
          continue;
        }

        const spread = checkSpread(oneMinuteCandlesA, oneMinuteCandlesB, beta);

        report.set(pairName, {
          pair: pairName,
          pValue: oneMinuteCointegration.pValue,
          halfLife,
          hurstExponent,
          correlationByPrices: correlation.correlationByPrices,
          correlationByReturns: correlation.correlationByReturns,
          beta,
          crossings,
          spread,
        });
      } catch (error) {
        console.error(pairName, error);

        report.set(pairName, null);
      }
    }

    const processedPairs = (i + 1) * (assetsWithVolume.length - 1) - (i * (i + 1)) / 2;
    const totalPairs = (assetsWithVolume.length * (assetsWithVolume.length - 1)) / 2;

    console.log(`${((processedPairs / totalPairs) * 100).toFixed(2)}% pairs processed`);
  }

  fs.mkdirSync(path.join(pairReportFolder, id), { recursive: true });

  const reportMetaData = {
    id,
    date,
  };

  const reportData = R.pipe(
    R.values(Object.fromEntries(report)),
    R.filter((entry) => entry !== null),
  );

  fs.writeFileSync(pairReportMetaDataFilePath(id), JSON.stringify(reportMetaData, null, 2));
  fs.writeFileSync(pairReportDataFilePath(id), JSON.stringify(reportData, null, 2));

  // Выводим статистику времени выполнения функций check*
  printPerformanceStats();
});

export const getReport = async (id: string) => {
  if (
    !fs.existsSync(pairReportMetaDataFilePath(id)) ||
    !fs.existsSync(pairReportDataFilePath(id))
  ) {
    return null;
  }

  const reportMetaDataContent = fs.readFileSync(pairReportMetaDataFilePath(id), 'utf-8');
  const reportDataContent = fs.readFileSync(pairReportDataFilePath(id), 'utf-8');

  const reportMetaData = JSON.parse(reportMetaDataContent) as Pick<TPairReport, 'id' | 'date'>;
  const reportData = JSON.parse(reportDataContent) as TPairReport['data'];

  return {
    ...reportMetaData,
    data: reportData,
  };
};

export const updateReport = async (id: string) => {
  const report = await getReport(id);
  if (!report) {
    return;
  }

  await createReport(report.date);
};

export const deleteReport = async (id: string) => {
  fs.rmSync(path.join(pairReportFolder, id), { recursive: true });
};

const getOneMinuteCandlesCache = measureTime(
  'Building one minute candles cache',
  (assets: Asset[], date: number) => getCandlesCache(assets, date, '1m', ONE_MINUTE_CANDLE_COUNT),
);

const getFiveMinuteCandlesCache = measureTime(
  'Building five minute candles cache',
  (assets: Asset[], date: number) => getCandlesCache(assets, date, '5m', FIVE_MINUTE_CANDLE_COUNT),
);

const getCandlesCache = async (
  assets: Asset[],
  date: number,
  timeframe: TTimeframe,
  candleCount: number,
): Promise<Map<string, TIndicatorCandle[]>> => {
  const cache = new Map<string, TIndicatorCandle[]>();

  await Promise.all(
    assets.map(async ({ symbol }) => {
      const candles = await Candle.findAll({
        where: {
          symbol,
          timeframe,
          openTime: {
            [Op.lte]: date,
          },
        },
        limit: candleCount,
        order: [['openTime', 'DESC']],
        raw: true,
      });

      candles.reverse();

      const candlesWithMetadata: TIndicatorCandle[] = candles.map((candle) => ({
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
      }));

      cache.set(symbol, candlesWithMetadata);
    }),
  );

  return cache;
};

const checkCorrelation = measureCheckTime(
  'checkCorrelation',
  (candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]) => {
    const correlationCandlesA = candlesA.slice(-CANDLE_COUNT_FOR_CORRELATION);
    const correlationCandlesB = candlesB.slice(-CANDLE_COUNT_FOR_CORRELATION);

    const pearsonCorrelation = new PearsonCorrelation();
    const correlationByPrices = pearsonCorrelation.correlationByPrices(
      correlationCandlesA,
      correlationCandlesB,
    );

    if (
      !correlationByPrices ||
      correlationByPrices < MIN_CORRELATION_BY_PRICES ||
      correlationByPrices > MAX_CORRELATION_BY_PRICES
    ) {
      return null;
    }

    const correlationByReturns = pearsonCorrelation.correlationByReturns(
      correlationCandlesA,
      correlationCandlesB,
    );

    if (
      !correlationByReturns ||
      correlationByReturns < MIN_CORRELATION_BY_RETURNS ||
      correlationByReturns > MAX_CORRELATION_BY_RETURNS
    ) {
      return null;
    }

    return {
      correlationByPrices,
      correlationByReturns,
    };
  },
);

const checkCointegration = measureCheckTime(
  'checkCointegration',
  (candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]) => {
    const cointegrationCandlesA = candlesA.slice(-CANDLE_COUNT_FOR_COINTEGRATION);
    const cointegrationCandlesB = candlesB.slice(-CANDLE_COUNT_FOR_COINTEGRATION);

    const engleGrangerTest = new EngleGrangerTest();
    const cointegration = engleGrangerTest.calculateCointegration(
      cointegrationCandlesA,
      cointegrationCandlesB,
    )!;
    if (!cointegration) {
      return null;
    }
    if (cointegration.pValue > MAX_COINTEGRATION_P_VALUE) {
      return null;
    }

    return cointegration;
  },
);

const checkRollingCorrelation = measureCheckTime(
  'checkRollingCorrelation',
  (candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]) => {
    const pearsonCorrelation = new PearsonCorrelation();

    const rollingCorrelationByReturns = pearsonCorrelation.rollingCorrelationByReturns(
      candlesA,
      candlesB,
      CANDLE_COUNT_FOR_CORRELATION_ROLLING,
    );

    if (!rollingCorrelationByReturns) {
      return false;
    }

    const correlationByReturnsValues = rollingCorrelationByReturns.map(({ value }) => value || 0);
    const correlationByReturnsMean = mean(correlationByReturnsValues);
    const correlationByReturnsCountOverThreshold = correlationByReturnsValues.filter(
      (value) => value > MIN_ROLLING_CORRELATION_BY_RETURNS_THRESHOLD,
    ).length;
    const correlationByReturnsCountOverThresholdRatio =
      correlationByReturnsCountOverThreshold /
      (correlationByReturnsValues.length - CANDLE_COUNT_FOR_CORRELATION_ROLLING + 1);

    if (
      correlationByReturnsMean <= MIN_ROLLING_CORRELATION_BY_RETURNS_MEAN ||
      correlationByReturnsCountOverThresholdRatio < MIN_ROLLING_CORRELATION_BY_RETURNS_RATIO
    ) {
      return false;
    }

    return true;
  },
);

const checkHurstExponent = measureCheckTime(
  'checkHurstExponent',
  (candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]) => {
    const hurstExponentCandlesA = candlesA.slice(-CANDLE_COUNT_FOR_HURST_EXPONENT);
    const hurstExponentCandlesB = candlesB.slice(-CANDLE_COUNT_FOR_HURST_EXPONENT);

    const hurstExponent = new HurstExponent();
    const hurstExponentValue = hurstExponent.calculate(
      hurstExponentCandlesA,
      hurstExponentCandlesB,
    )!;
    if (!hurstExponentValue) {
      return null;
    }
    if (hurstExponentValue >= MAX_HURST_EXPONENT) {
      return null;
    }

    return hurstExponentValue;
  },
);

const checkHalfLife = measureCheckTime(
  'checkHalfLife',
  (candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]) => {
    const halfLifeCandlesA = candlesA.slice(-CANDLE_COUNT_FOR_HALF_LIFE);
    const halfLifeCandlesB = candlesB.slice(-CANDLE_COUNT_FOR_HALF_LIFE);

    const minHalfLifeBars = Math.floor(MIN_HALF_LIFE_DURATION_MS / timeframeToMilliseconds('1m'));
    const maxHalfLifeBars = Math.ceil(MAX_HALF_LIFE_DURATION_MS / timeframeToMilliseconds('1m'));

    const halfLife = new HalfLife();
    const halfLifeValue = halfLife.calculate(halfLifeCandlesA, halfLifeCandlesB)!;
    if (!halfLifeValue) {
      return null;
    }
    if (halfLifeValue < minHalfLifeBars || halfLifeValue > maxHalfLifeBars) {
      return null;
    }

    return halfLifeValue;
  },
);

const checkBetaHedge = measureCheckTime(
  'checkBetaHedge',
  (candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]) => {
    const betaHedge = new BetaHedge();
    const beta = betaHedge.calculateBeta(candlesA, candlesB)!;
    if (!beta) {
      return null;
    }

    return beta;
  },
);

const checkCrossings = measureCheckTime(
  'checkCrossings',
  (candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[], beta: number) => {
    if (candlesA.length !== candlesB.length) {
      return 0;
    }

    const spread = candlesA.map(
      (candle, index) => candle.close - (candlesB.at(index)?.close || 0) * beta,
    );
    const spreadMean = mean(spread);

    let crossings = 0;

    for (let i = 1; i < spread.length; i++) {
      const prev = spread[i - 1] - spreadMean;
      const curr = spread[i] - spreadMean;
      if (prev * curr < 0) {
        crossings++;
      }
    }

    return crossings;
  },
);

const checkSpread = measureCheckTime(
  'checkSpread',
  (candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[], beta: number) => {
    if (candlesA.length !== candlesB.length) {
      return null;
    }

    // Вычисляем спред как разность цен с учетом коэффициента бета
    const spread = candlesA
      .slice(-CANDLE_COUNT_FOR_SPREAD)
      .map((candle, index) => candle.close - (candlesB.at(index)?.close || 0) * beta);

    const spreadMean = mean(spread);
    const spreadMedian = median(spread);
    const spreadStd = std(spread) as unknown as number;

    return {
      mean: spreadMean,
      median: spreadMedian,
      std: spreadStd,
    };
  },
);

export const getReportBacktest = async (id: string) => {
  if (!fs.existsSync(pairReportBacktestFilePath(id))) {
    return null;
  }

  const reportBacktestContent = fs.readFileSync(pairReportBacktestFilePath(id), 'utf-8');

  const reportBacktest = JSON.parse(reportBacktestContent);

  return reportBacktest;
};

export const createReportBacktest = async (
  id: string,
  startTimestamp: number,
  endTimestamp: number,
) => {
  const report = await getReport(id);
  if (!report) {
    return null;
  }

  const reportBacktest = await run(
    report.data.map((entry) => entry.pair),
    startTimestamp,
    endTimestamp,
  );

  fs.writeFileSync(pairReportBacktestFilePath(id), JSON.stringify(reportBacktest, null, 2));
};
