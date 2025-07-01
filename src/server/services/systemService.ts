import * as R from 'remeda';

import { TTimeframe } from '../../shared/types';
import { dayjs } from '../../shared/utils/daytime';
import { timeframeToMilliseconds } from '../utils/timeframe';
import {
  BinanceHTTPClient,
  TAsset as TBinanceAsset,
} from '../trading/providers/Binance/spot/BinanceHTTPClient';
import { Asset } from '../models/Asset';
import { Candle } from '../models/Candle';
import { Trade } from '../models/Trade';
import { measureTime } from '../utils/performance/measureTime';

const binanceHttpClient = BinanceHTTPClient.getInstance();

const TIMEFRAME_LIMITS: Record<TTimeframe, number> = {
  '1m': dayjs.duration(30, 'day').asMinutes(),
  '5m': dayjs.duration(40, 'day').asMinutes() / 5,
  '15m': dayjs.duration(10, 'day').asMinutes() / 15,
  '30m': dayjs.duration(10, 'day').asMinutes() / 30,
  '1h': dayjs.duration(30, 'day').asHours(),
  '4h': dayjs.duration(60, 'day').asHours() / 4,
  '1d': dayjs.duration(100, 'day').asDays(),
};

export const flushDatabase = async () => {
  await Asset.destroy({ where: {} });
  await Candle.destroy({ where: {} });
  await Trade.destroy({ where: {} });
};

export const flushTrades = async () => {
  await Trade.destroy({ where: {} });
};

export const getSystemInfo = async () => {
  const assetCount = await Asset.count();

  const timeframeCandles: Record<TTimeframe, { first: number | null; last: number | null }> =
    {} as Record<TTimeframe, { first: number | null; last: number | null }>;

  for (const timeframe of Object.keys(TIMEFRAME_LIMITS) as TTimeframe[]) {
    const firstCandle = await Candle.findOne({
      where: { symbol: 'BTCUSDT', timeframe },
      order: [['openTime', 'ASC']],
      attributes: ['openTime'],
    });
    const lastCandle = await Candle.findOne({
      where: { symbol: 'BTCUSDT', timeframe },
      order: [['openTime', 'DESC']],
      attributes: ['openTime'],
    });

    timeframeCandles[timeframe] = {
      first: firstCandle ? firstCandle.openTime : null,
      last: lastCandle ? lastCandle.openTime : null,
    };
  }

  return {
    assetCount,
    timeframeCandles,
  };
};

const getAssetPricePrecision = (asset: TBinanceAsset): number => {
  const priceFilter = asset.filters.find((filter) => filter.filterType === 'PRICE_FILTER');
  if (priceFilter) {
    const tickSize = priceFilter.tickSize;

    if (tickSize && tickSize.includes('.')) {
      return tickSize.split('.')[1].replace(/0+$/, '').length;
    }
  }

  return asset.baseAssetPrecision;
};

const getAssetVolumePrecision = (asset: TBinanceAsset): number => {
  const lotSize = asset.filters.find((filter) => filter.filterType === 'LOT_SIZE');
  if (lotSize) {
    const stepSize = lotSize.stepSize;
    return stepSize.split('.')[1].replace(/0+$/, '').length;
  }

  return asset.quoteAssetPrecision;
};

const CANDLES_LIMIT = 1000;

const fetchCandlesInBatches = async ({
  symbol,
  timeframe,
  totalCandles,
  initialTime,
}: {
  symbol: string;
  timeframe: TTimeframe;
  totalCandles: number;
  initialTime: number;
}) => {
  let remaining = totalCandles;
  const timeframeMs = timeframeToMilliseconds(timeframe);
  // Если стартовое время не передано — считаем от текущего момента назад на totalCandles баров
  let currentStartTime = initialTime - remaining * timeframeMs;

  const result: Awaited<ReturnType<typeof binanceHttpClient.fetchAssetCandles>> = [];

  while (remaining > 0) {
    const chunkSize = Math.min(remaining, CANDLES_LIMIT);

    const candles = await binanceHttpClient.fetchAssetCandles({
      symbol,
      timeframe,
      limit: chunkSize,
      startTime: currentStartTime,
    });

    if (!candles.length) {
      break;
    }

    result.push(...candles);
    remaining -= candles.length;
    // Смещаем стартовое время на следующий бар после последнего полученного
    currentStartTime = candles[candles.length - 1].closeTime + 1;
    // Если получили меньше чем запрашивали — дальше данных нет
    if (candles.length < chunkSize) {
      break;
    }
  }

  return result;
};

export const loadCandles = measureTime(
  'Candles loading',
  async (initialDate: number = Date.now()) => {
    const binanceAssets = await binanceHttpClient.fetchAssets();
    const binanceAssets24HrStats = await binanceHttpClient.getAssets24HrStats();
    const binanceAssetsSymbols = binanceAssets.map((asset) => asset.symbol);

    await Asset.destroy({ where: {} });

    const assetsToSave = binanceAssets.map((asset) => {
      const assetStats = binanceAssets24HrStats.find((stats) => asset.symbol === stats.symbol)!;

      const pricePrecision = getAssetPricePrecision(asset);
      const volumePrecision = getAssetVolumePrecision(asset);

      const usdtVolume = (() => {
        if (asset.baseAsset === 'USDT') {
          return assetStats.quoteVolume;
        }

        const baseToUsdtAsset = binanceAssets24HrStats.find(
          (stats) => stats.symbol === `${asset.baseAsset}USDT`,
        );

        if (!baseToUsdtAsset) {
          return 0;
        }

        return Number(baseToUsdtAsset.lastPrice) * Number(assetStats.volume);
      })();

      return {
        ...asset,
        ...assetStats,
        pricePrecision,
        volumePrecision,
        usdtVolume: String(usdtVolume),
      };
    });

    await Asset.bulkCreate(assetsToSave);

    const timeframes: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const;

    const initialTimestamp = dayjs(initialDate)
      .hour(0)
      .minute(0)
      .second(0)
      .millisecond(0)
      .valueOf();

    const chunks = R.chunk(binanceAssetsSymbols, 20);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (symbol) => {
          await Promise.all(
            timeframes.map(async (timeframe) => {
              const candlesToFetch = TIMEFRAME_LIMITS[timeframe] ?? CANDLES_LIMIT;

              const candles = await fetchCandlesInBatches({
                symbol,
                timeframe,
                totalCandles: candlesToFetch,
                initialTime: initialTimestamp,
              });

              if (candles.length) {
                await Candle.bulkCreate(
                  candles.map((candle) => ({
                    ...candle,
                    symbol,
                    timeframe,
                  })),
                  {
                    ignoreDuplicates: true,
                  },
                );
              }

              console.log(`Saved ${candles.length} candles for ${symbol} (${timeframe})`);
              return;
            }),
          );

          console.log(`Processed symbol ${symbol}`);
        }),
      );
    }
  },
);
