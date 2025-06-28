import { Op } from 'sequelize';
import { mean, std, median } from 'mathjs';

import { dayjs } from '../../shared/utils/daytime';
import { TTimeframe, TMRReportEntry } from '../../shared/types';
import { mrReportLogger as logger } from '../utils/logger';
import { PerformanceTracker } from '../utils/performance/PerformanceTracker';
import { timeframeToMilliseconds } from '../utils/timeframe';
import { Asset } from '../models/Asset';
import { Candle } from '../models/Candle';
import { PearsonCorrelation } from '../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { BetaHedge } from '../trading/indicators/BetaHedge/BetaHedge';
import { EngleGrangerTest } from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { TIndicatorShortCandle } from '../trading/indicators/types';
import { HalfLife } from '../trading/indicators/HalfLife/HalfLife';
import { HurstExponent } from '../trading/indicators/HurstExponent/HurstExponent';

const MIN_DAILY_CANDLE_VOLUME = 1_000_000;

const ONE_MINUTE_CANDLE_COUNT = 1440;
const FIVE_MINUTE_CANDLE_COUNT = 1440;

const CANDLE_COUNT_FOR_CORRELATION = 90;
const CANDLE_COUNT_FOR_CORRELATION_ROLLING = 1440;
const CANDLE_COUNT_FOR_CORRELATION_ROLLING_WINDOW = 300;
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

const performanceTracker = new PerformanceTracker(false);

export const buildMrReport = async (date: number) => {
  logger.info(`Creating report for: ${dayjs(date).format('DD.MM HH:mm:ss')}`);

  const assetsWithVolume = await filterAssetsByDailyCandleVolume(date);

  logger.info(`Assets with volume: ${assetsWithVolume.length}`);
  logger.info(`Pairs to process: ${(assetsWithVolume.length * (assetsWithVolume.length - 1)) / 2}`);

  const tradablePairs: TMRReportEntry[] = [];

  const oneMinuteCandlesCache = await getOneMinuteCandlesCache(assetsWithVolume, date);
  const fiveMinuteCandlesCache = await getFiveMinuteCandlesCache(assetsWithVolume, date);

  for (let i = 0; i < assetsWithVolume.length; i++) {
    const assetA = assetsWithVolume[i];

    const oneMinuteCandlesA = oneMinuteCandlesCache.get(assetA.symbol)!;
    if (oneMinuteCandlesA.length < ONE_MINUTE_CANDLE_COUNT) {
      continue;
    }

    const fiveMinuteCandlesA = fiveMinuteCandlesCache.get(assetA.symbol)!;
    if (fiveMinuteCandlesA.length < FIVE_MINUTE_CANDLE_COUNT) {
      continue;
    }

    for (let j = i + 1; j < assetsWithVolume.length; j++) {
      const assetB = assetsWithVolume[j];

      const oneMinuteCandlesB = oneMinuteCandlesCache.get(assetB.symbol)!;
      if (oneMinuteCandlesB.length < ONE_MINUTE_CANDLE_COUNT) {
        continue;
      }

      const fiveMinuteCandlesB = fiveMinuteCandlesCache.get(assetB.symbol)!;
      if (fiveMinuteCandlesB.length < FIVE_MINUTE_CANDLE_COUNT) {
        continue;
      }

      try {
        const pairResult = processPair(
          assetA,
          assetB,
          oneMinuteCandlesA,
          oneMinuteCandlesB,
          fiveMinuteCandlesA,
          fiveMinuteCandlesB,
        );

        if (pairResult) {
          tradablePairs.push(pairResult);
        }
      } catch (error) {
        logger.error('processPair error', {
          assetA: assetA.symbol,
          assetB: assetB.symbol,
          error,
        });
      }
    }

    const processedPairs = (i + 1) * (assetsWithVolume.length - 1) - (i * (i + 1)) / 2;
    const totalPairs = (assetsWithVolume.length * (assetsWithVolume.length - 1)) / 2;
    const progress = Math.round((processedPairs / totalPairs) * 100);

    logger.verbose(`${progress}% pairs processed`);
  }

  logger.info(`Report length: ${tradablePairs.length}`);

  performanceTracker.printStats();

  return tradablePairs;
};

const filteredAssetsCache = new Map<number, Asset[]>();

/**
 * Рассчитывает и фильтрует активы по объему на основе данных дневной свечи одним запросом
 *
 * Универсальная логика конвертации в USDT:
 * - Для USDT пар: объем берется напрямую из quoteAssetVolume
 * - Для других котировок (BTC, ETH, BNB и т.д.):
 *   находится курс котируемой валюты к USDT (например, BTCUSDT для BTC пар)
 *   и объем конвертируется: quoteAssetVolume * курс_к_USDT
 * - Fallback: если курс не найден, используется статическое поле usdtVolume
 *
 * @param date Дата для поиска дневной свечи
 * @returns Отфильтрованный массив активов с достаточным объемом торгов
 */
const filterAssetsByDailyCandleVolume = async (date: number): Promise<Asset[]> => {
  const previousDay = dayjs(date).hour(0).minute(0).second(0).millisecond(0).valueOf();

  if (filteredAssetsCache.has(previousDay)) {
    return filteredAssetsCache.get(previousDay)!;
  }

  const assets = await Asset.findAll();
  const filteredAssets: Asset[] = [];

  for (const asset of assets) {
    const assetLastCandle = await Candle.findOne({
      where: {
        symbol: asset.symbol,
        timeframe: '1d',
        openTime: {
          [Op.lte]: previousDay,
        },
      },
      order: [['openTime', 'DESC']],
      raw: true,
    });

    if (!assetLastCandle) {
      continue;
    }

    let volumeInUsdt: number;

    if (asset.quoteAsset === 'USDT') {
      volumeInUsdt = Number(assetLastCandle.quoteAssetVolume);
    } else {
      const quoteUsdtCandle = await Candle.findOne({
        where: {
          symbol: `${asset.quoteAsset}USDT`,
          timeframe: '1d',
          openTime: {
            [Op.lte]: previousDay,
          },
        },
        order: [['openTime', 'DESC']],
        raw: true,
      });

      if (!quoteUsdtCandle) {
        continue;
      } else {
        const assetVolumeInQuote = Number(assetLastCandle.quoteAssetVolume);
        const quoteRateToUsdt = Number(quoteUsdtCandle.close);
        volumeInUsdt = assetVolumeInQuote * quoteRateToUsdt;
      }
    }

    if (volumeInUsdt >= MIN_DAILY_CANDLE_VOLUME) {
      filteredAssets.push(asset);
    }
  }

  filteredAssetsCache.set(previousDay, filteredAssets);

  return filteredAssets;
};

const getOneMinuteCandlesCache = (assets: Asset[], date: number) =>
  getCandlesCache(assets, date, '1m', ONE_MINUTE_CANDLE_COUNT);

const getFiveMinuteCandlesCache = (assets: Asset[], date: number) =>
  getCandlesCache(assets, date, '5m', FIVE_MINUTE_CANDLE_COUNT);

const getCandlesCache = async (
  assets: Asset[],
  date: number,
  timeframe: TTimeframe,
  candleCount: number,
): Promise<Map<string, TIndicatorShortCandle[]>> => {
  const cache = new Map<string, TIndicatorShortCandle[]>();

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
        attributes: ['openTime', 'close', 'volume'],
        limit: candleCount,
        order: [['openTime', 'DESC']],
        raw: true,
      });

      candles.reverse();

      const candlesWithMetadata: TIndicatorShortCandle[] = candles.map((candle) => ({
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

const processPair = (
  assetA: Asset,
  assetB: Asset,
  oneMinuteCandlesA: TIndicatorShortCandle[],
  oneMinuteCandlesB: TIndicatorShortCandle[],
  fiveMinuteCandlesA: TIndicatorShortCandle[],
  fiveMinuteCandlesB: TIndicatorShortCandle[],
): TMRReportEntry | null => {
  const correlation = checkCorrelation(oneMinuteCandlesA, oneMinuteCandlesB);
  if (!correlation) {
    return null;
  }

  const halfLife = checkHalfLife(oneMinuteCandlesA, oneMinuteCandlesB);
  if (!halfLife) {
    return null;
  }

  const oneMinuteCointegration = checkCointegration(oneMinuteCandlesA, oneMinuteCandlesB);
  if (!oneMinuteCointegration) {
    return null;
  }

  const fiveMinuteCointegration = checkCointegration(fiveMinuteCandlesA, fiveMinuteCandlesB);
  if (!fiveMinuteCointegration) {
    return null;
  }

  if (!checkRollingCorrelation(oneMinuteCandlesA, oneMinuteCandlesB)) {
    return null;
  }

  const hurstExponent = checkHurstExponent(oneMinuteCandlesA, oneMinuteCandlesB);
  if (!hurstExponent) {
    return null;
  }

  const beta = checkBetaHedge(oneMinuteCandlesA, oneMinuteCandlesB);
  if (!beta) {
    return null;
  }

  const crossings = checkCrossings(oneMinuteCandlesA, oneMinuteCandlesB, beta);
  if (crossings === 0) {
    return null;
  }

  const spread = checkSpread(oneMinuteCandlesA, oneMinuteCandlesB, beta);

  return {
    assetA: {
      baseAsset: assetA.baseAsset,
      quoteAsset: assetA.quoteAsset,
    },
    assetB: {
      baseAsset: assetB.baseAsset,
      quoteAsset: assetB.quoteAsset,
    },
    pValue: oneMinuteCointegration.pValue,
    halfLife,
    hurstExponent,
    correlationByPrices: correlation.correlationByPrices,
    correlationByReturns: correlation.correlationByReturns,
    crossings,
    spread,
  };
};

const checkCorrelation = performanceTracker.measureTime(
  'checkCorrelation',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[]) => {
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

const checkCointegration = performanceTracker.measureTime(
  'checkCointegration',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[]) => {
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

const checkRollingCorrelation = performanceTracker.measureTime(
  'checkRollingCorrelation',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[]) => {
    const rollingCorrelationCandlesA = candlesA.slice(-CANDLE_COUNT_FOR_CORRELATION_ROLLING);
    const rollingCorrelationCandlesB = candlesB.slice(-CANDLE_COUNT_FOR_CORRELATION_ROLLING);

    const pearsonCorrelation = new PearsonCorrelation();
    const rollingCorrelationByReturns = pearsonCorrelation.rollingCorrelationByReturns(
      rollingCorrelationCandlesA,
      rollingCorrelationCandlesB,
      CANDLE_COUNT_FOR_CORRELATION_ROLLING_WINDOW,
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
      (correlationByReturnsValues.length - CANDLE_COUNT_FOR_CORRELATION_ROLLING_WINDOW + 1);

    if (
      correlationByReturnsMean <= MIN_ROLLING_CORRELATION_BY_RETURNS_MEAN ||
      correlationByReturnsCountOverThresholdRatio < MIN_ROLLING_CORRELATION_BY_RETURNS_RATIO
    ) {
      return false;
    }

    return true;
  },
);

const checkHurstExponent = performanceTracker.measureTime(
  'checkHurstExponent',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[]) => {
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

const checkHalfLife = performanceTracker.measureTime(
  'checkHalfLife',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[]) => {
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

const checkBetaHedge = performanceTracker.measureTime(
  'checkBetaHedge',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[]) => {
    const betaHedge = new BetaHedge();
    const beta = betaHedge.calculateBeta(candlesA, candlesB)!;
    if (!beta) {
      return null;
    }

    return beta;
  },
);

const checkCrossings = performanceTracker.measureTime(
  'checkCrossings',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[], beta: number) => {
    const minLength = Math.min(candlesA.length, candlesB.length);
    const pricesA = candlesA.slice(-minLength).map((candle) => candle.close);
    const pricesB = candlesB.slice(-minLength).map((candle) => candle.close);

    const spread = pricesA.map((price, index) => price - pricesB[index] * beta);
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

const checkSpread = performanceTracker.measureTime(
  'checkSpread',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[], beta: number) => {
    const pricesA = candlesA.slice(-CANDLE_COUNT_FOR_SPREAD).map((candle) => candle.close);
    const pricesB = candlesB.slice(-CANDLE_COUNT_FOR_SPREAD).map((candle) => candle.close);

    const spread = pricesA.map((price, index) => price - pricesB[index] * beta);
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
