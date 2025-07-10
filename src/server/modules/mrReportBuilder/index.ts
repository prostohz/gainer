import { Op } from 'sequelize';
import { mean, std, median } from 'mathjs';

import { dayjs } from '../../../shared/utils/daytime';
import { TTimeframe, TMRReportPair } from '../../../shared/types';
import { mrReportLogger as logger } from '../../utils/logger';
import { PerformanceTracker } from '../../utils/performance/PerformanceTracker';
import { timeframeToMilliseconds } from '../../utils/timeframe';
import { Asset } from '../../models/Asset';
import { Candle } from '../../models/Candle';
import { PearsonCorrelation } from '../../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { BetaHedge } from '../../trading/indicators/BetaHedge/BetaHedge';
import { EngleGrangerTest } from '../../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { EngleGrangerTestOptimized } from '../../trading/indicators/EngleGrangerTest/EngleGrangerTestOptimized';
import { TIndicatorShortCandle } from '../../trading/indicators/types';
import { HalfLife } from '../../trading/indicators/HalfLife/HalfLife';
import {
  MIN_DAILY_CANDLE_VOLUME,
  ONE_MINUTE_CANDLE_COUNT,
  FIVE_MINUTE_CANDLE_COUNT,
  CANDLE_COUNT_FOR_CORRELATION,
  CANDLE_COUNT_FOR_SPREAD_VOLATILITY,
  CANDLE_COUNT_FOR_CORRELATION_ROLLING,
  CANDLE_COUNT_FOR_CORRELATION_ROLLING_WINDOW,
  CANDLE_COUNT_FOR_COINTEGRATION,
  CANDLE_COUNT_FOR_HALF_LIFE,
  CANDLE_COUNT_FOR_SPREAD,
  MIN_CORRELATION_BY_PRICES,
  MAX_CORRELATION_BY_PRICES,
  MIN_CORRELATION_BY_RETURNS,
  MAX_CORRELATION_BY_RETURNS,
  MIN_SPREAD_VOLATILITY_PERCENT,
  MAX_SPREAD_VOLATILITY_PERCENT,
  MIN_ROLLING_CORRELATION_BY_RETURNS_MEAN,
  MIN_ROLLING_CORRELATION_BY_RETURNS_THRESHOLD,
  MIN_ROLLING_CORRELATION_BY_RETURNS_RATIO,
  MAX_COINTEGRATION_P_VALUE,
  MIN_HALF_LIFE_DURATION_MS,
  MAX_HALF_LIFE_DURATION_MS,
} from './configs';
import { calculatePairScore } from './pairScore';

const performanceTracker = new PerformanceTracker(false);

export const buildMrReport = async (date: number) => {
  logger.info(`Creating report for: ${dayjs(date).format('DD.MM HH:mm:ss')}`);

  const assetsWithVolume = await filterAssetsByDailyCandleVolume(date);

  logger.info(`Assets with volume: ${assetsWithVolume.length}`);

  const tradablePairs: TMRReportPair[] = [];

  const [oneMinuteCandlesCache, fiveMinuteCandlesCache] = await Promise.all([
    getOneMinuteCandlesCache(assetsWithVolume, date),
    getFiveMinuteCandlesCache(assetsWithVolume, date),
  ]);

  const assetsWithCandles = assetsWithVolume.filter((asset) => {
    const oneMinuteCandles = oneMinuteCandlesCache.get(asset.symbol)!;
    const fiveMinuteCandles = fiveMinuteCandlesCache.get(asset.symbol)!;
    return (
      oneMinuteCandles.length >= ONE_MINUTE_CANDLE_COUNT &&
      fiveMinuteCandles.length >= FIVE_MINUTE_CANDLE_COUNT
    );
  });

  logger.info(`Assets with candles: ${assetsWithCandles.length}`);
  logger.info(
    `Pairs to process: ${(assetsWithCandles.length * (assetsWithCandles.length - 1)) / 2}`,
  );

  for (let i = 0; i < assetsWithCandles.length; i++) {
    const assetA = assetsWithCandles[i];

    const oneMinuteCandlesA = oneMinuteCandlesCache.get(assetA.symbol)!;
    const fiveMinuteCandlesA = fiveMinuteCandlesCache.get(assetA.symbol)!;

    for (let j = i + 1; j < assetsWithCandles.length; j++) {
      const assetB = assetsWithCandles[j];

      const oneMinuteCandlesB = oneMinuteCandlesCache.get(assetB.symbol)!;
      const fiveMinuteCandlesB = fiveMinuteCandlesCache.get(assetB.symbol)!;

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

    const processedPairs = (i + 1) * (assetsWithCandles.length - 1) - (i * (i + 1)) / 2;
    const totalPairs = (assetsWithCandles.length * (assetsWithCandles.length - 1)) / 2;
    const progress = ((processedPairs / totalPairs) * 100).toFixed(2);

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

  try {
    const assets = await Asset.findAll();
    const filteredAssets: Asset[] = [];

    for (const asset of assets) {
      try {
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
      } catch (assetError) {
        logger.error(`Error processing asset ${asset.symbol}:`, {
          error: assetError,
          message: assetError instanceof Error ? assetError.message : 'Unknown error',
          stack: assetError instanceof Error ? assetError.stack : undefined,
        });
        throw assetError;
      }
    }

    filteredAssetsCache.set(previousDay, filteredAssets);
    logger.info(`Filtered ${filteredAssets.length} assets with sufficient volume`);

    return filteredAssets;
  } catch (error) {
    logger.error('Error in filterAssetsByDailyCandleVolume:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      date: dayjs(date).format('DD.MM.YYYY HH:mm'),
      previousDay: dayjs(previousDay).format('DD.MM.YYYY HH:mm'),
    });
    throw error;
  }
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

export const processPair = (
  assetA: Asset,
  assetB: Asset,
  oneMinuteCandlesA: TIndicatorShortCandle[],
  oneMinuteCandlesB: TIndicatorShortCandle[],
  fiveMinuteCandlesA: TIndicatorShortCandle[],
  fiveMinuteCandlesB: TIndicatorShortCandle[],
): TMRReportPair | null => {
  const correlation = checkCorrelation(oneMinuteCandlesA, oneMinuteCandlesB);
  if (!correlation) {
    return null;
  }

  const beta = checkBetaHedge(oneMinuteCandlesA, oneMinuteCandlesB);
  if (!beta) {
    return null;
  }

  if (!checkSpreadVolatility(oneMinuteCandlesA, oneMinuteCandlesB, beta)) {
    return null;
  }

  const crossings = checkCrossings(oneMinuteCandlesA, oneMinuteCandlesB, beta);
  if (crossings === 0) {
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

  const spread = checkSpread(oneMinuteCandlesA, oneMinuteCandlesB, beta);

  const pairWithoutScore = {
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
    correlationByPrices: correlation.correlationByPrices,
    correlationByReturns: correlation.correlationByReturns,
    crossings,
    spread,
  };

  const score = calculatePairScore(pairWithoutScore);

  const pair: TMRReportPair = {
    ...pairWithoutScore,
    score,
  };

  return pair;
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

/**
 * Проверяет, находится ли волатильность спреда в допустимых границах
 * Минимум: достаточно для покрытия комиссий и получения прибыли
 * Максимум: не приводит к слишком частому срабатыванию стоп-лосса
 */
const checkSpreadVolatility = performanceTracker.measureTime(
  'checkSpreadVolatility',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[], beta: number): boolean => {
    const candlesCount = Math.min(
      candlesA.length,
      candlesB.length,
      CANDLE_COUNT_FOR_SPREAD_VOLATILITY,
    );

    const startIndex = Math.max(0, candlesA.length - candlesCount);
    const spreads: number[] = [];

    // Рассчитываем спреды для каждой свечи
    for (let i = startIndex; i < candlesA.length; i++) {
      const priceA = candlesA[i].close;
      const priceB = candlesB[i].close;
      const spread = priceA - beta * priceB;
      spreads.push(spread);
    }

    if (spreads.length < 2) {
      return false;
    }

    // Рассчитываем процентные изменения спреда
    const spreadReturns: number[] = [];
    for (let i = 1; i < spreads.length; i++) {
      const prevSpread = spreads[i - 1];
      if (Math.abs(prevSpread) > 1e-10) {
        const spreadReturn = ((spreads[i] - prevSpread) / Math.abs(prevSpread)) * 100;
        spreadReturns.push(spreadReturn);
      }
    }

    if (spreadReturns.length < 10) {
      return false;
    }

    // Волатильность = стандартное отклонение процентных изменений
    const spreadReturnsStd = Number(std(spreadReturns));
    const volatility = isFinite(spreadReturnsStd) ? spreadReturnsStd : 0;

    if (volatility <= 0) {
      return false;
    }

    if (volatility < MIN_SPREAD_VOLATILITY_PERCENT) {
      return false; // Слишком низкая волатильность для прибыльной торговли
    }

    if (volatility > MAX_SPREAD_VOLATILITY_PERCENT) {
      return false; // Слишком высокая волатильность приведет к большим стоп-лоссам
    }

    return true;
  },
);

const checkCointegration = performanceTracker.measureTime(
  'checkCointegration',
  (candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[]) => {
    const cointegrationCandlesA = candlesA.slice(-CANDLE_COUNT_FOR_COINTEGRATION);
    const cointegrationCandlesB = candlesB.slice(-CANDLE_COUNT_FOR_COINTEGRATION);

    const engleGrangerTest = new EngleGrangerTestOptimized();
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
