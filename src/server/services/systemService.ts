import { TTimeframe } from '../../shared/types';
import dayjs from '../../shared/utils/daytime';
import { timeframeToMilliseconds } from '../utils/timeframe';
import BinanceHTTPClient, {
  TAsset as TBinanceAsset,
} from '../trading/providers/Binance/BinanceHTTPClient';
import { Asset } from '../models/Asset';
import { Candle } from '../models/Candle';
import { Trade } from '../models/Trade';
import { measureTime } from '../utils/performance';

const binanceHttpClient = BinanceHTTPClient.getInstance();

export const flushDatabase = async () => {
  await Asset.destroy({ where: {} });
  await Candle.destroy({ where: {} });
  await Trade.destroy({ where: {} });
};

export const getSystemInfo = async () => {
  const assetCount = await Asset.count();
  const firstCandle = await Candle.findOne({
    where: { symbol: 'BTCUSDT', timeframe: '1m' },
    order: [['openTime', 'ASC']],
    attributes: ['openTime'],
    limit: 1,
  });
  const lastCandle = await Candle.findOne({
    where: { symbol: 'BTCUSDT', timeframe: '1m' },
    order: [['openTime', 'DESC']],
    attributes: ['openTime'],
    limit: 1,
  });

  return {
    assetCount,
    firstCandleTime: firstCandle?.openTime,
    lastCandleTime: lastCandle?.openTime,
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

const TIMEFRAME_LIMITS: Record<TTimeframe, number> = {
  '1m': dayjs.duration(5, 'day').asMinutes(),
  '5m': dayjs.duration(10, 'day').asMinutes() / 5,
  '15m': dayjs.duration(30, 'day').asMinutes() / 15,
  '30m': dayjs.duration(90, 'day').asMinutes() / 30,
  '1h': dayjs.duration(180, 'day').asHours(),
  '4h': dayjs.duration(360, 'day').asHours() / 4,
  '1d': dayjs.duration(720, 'day').asDays(),
};

const fetchCandlesInBatches = async ({
  symbol,
  timeframe,
  totalCandles,
  startTime,
}: {
  symbol: string;
  timeframe: TTimeframe;
  totalCandles: number;
  startTime?: number;
}) => {
  let remaining = totalCandles;
  const timeframeMs = timeframeToMilliseconds(timeframe);
  // Если стартовое время не передано — считаем от текущего момента назад на totalCandles баров
  let currentStartTime = startTime ?? Date.now() - remaining * timeframeMs;

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

export const loadCandles = measureTime('Candles loading', async () => {
  const binanceAssets = await binanceHttpClient.fetchAssets();
  const binanceAssets24HrStats = await binanceHttpClient.getAssets24HrStats();
  const savedAssets = await Asset.findAll();

  const binanceAssetsSymbols = binanceAssets.map((asset) => asset.symbol);
  const savedAssetsSymbols = savedAssets.map((asset) => asset.symbol);

  const newAssetsSymbols = binanceAssetsSymbols.filter(
    (item) => !savedAssetsSymbols.includes(item),
  );

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

  const timeframes: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  try {
    for (const symbol of binanceAssetsSymbols) {
      const isNewAsset = newAssetsSymbols.includes(symbol);

      await Promise.all(
        timeframes.map(async (timeframe) => {
          if (isNewAsset) {
            const candlesToFetch = TIMEFRAME_LIMITS[timeframe] ?? CANDLES_LIMIT;

            const candles = await fetchCandlesInBatches({
              symbol,
              timeframe,
              totalCandles: candlesToFetch,
            });

            if (candles.length) {
              await Candle.bulkCreate(
                candles.map((candle) => ({
                  ...candle,
                  symbol,
                  timeframe,
                })),
              );
            }

            console.log(`Saved ${candles.length} candles for ${symbol} (${timeframe})`);
            return;
          }

          const lastCandle = await Candle.findOne({
            where: { symbol, timeframe },
            order: [['openTime', 'DESC']],
          });

          if (lastCandle) {
            // Проверяем, закрыта ли последняя свеча
            const currentTime = Date.now();
            const lastCandleEndTime = lastCandle.closeTime;

            // Определяем время начала запроса
            let startTime;

            // Если последняя свеча ещё не закрыта, удаляем её и начинаем запрос с её времени открытия
            if (currentTime < lastCandleEndTime) {
              await Candle.destroy({
                where: { symbol, timeframe, openTime: lastCandle.openTime },
              });
              console.log(`Deleted open candle for ${symbol} (${timeframe})`);
              startTime = lastCandle.openTime;
            } else {
              startTime = lastCandle.closeTime + 1;
            }

            const limit = Math.ceil((currentTime - startTime) / timeframeToMilliseconds(timeframe));
            if (limit <= 0) {
              return;
            }

            const candles = await fetchCandlesInBatches({
              symbol,
              timeframe,
              totalCandles: limit,
              startTime,
            });

            if (candles.length > 0) {
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
              console.log(`Loaded ${candles.length} candles for ${symbol} (${timeframe})`);
            }
          } else {
            const candlesToFetch = TIMEFRAME_LIMITS[timeframe];

            const candles = await fetchCandlesInBatches({
              symbol,
              timeframe,
              totalCandles: candlesToFetch,
            });

            if (candles.length > 0) {
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
              console.log(`Saved ${candles.length} candles for ${symbol} (${timeframe})`);
            }
          }
        }),
      );

      console.log(`Processed symbol ${symbol}`);
    }
  } catch (error) {
    console.error('Error updating database:', error);
  }
});
