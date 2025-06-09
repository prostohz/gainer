import { TTimeframe } from '../../shared/types';
import { timeframeToMilliseconds } from '../utils/timeframe';
import BinanceHTTPClient, {
  TAsset as TBinanceAsset,
} from '../trading/providers/Binance/BinanceHTTPClient';
import { Asset } from '../models/Asset';
import { Candle } from '../models/Candle';

const binanceHttpClient = BinanceHTTPClient.getInstance();

export const getAssetPricePrecision = (asset: TBinanceAsset): number => {
  const priceFilter = asset.filters.find((filter) => filter.filterType === 'PRICE_FILTER');
  if (priceFilter) {
    const tickSize = priceFilter.tickSize;

    if (tickSize && tickSize.includes('.')) {
      return tickSize.split('.')[1].replace(/0+$/, '').length;
    }
  }

  return asset.baseAssetPrecision;
};

export const getAssetVolumePrecision = (asset: TBinanceAsset): number => {
  const lotSize = asset.filters.find((filter) => filter.filterType === 'LOT_SIZE');
  if (lotSize) {
    const stepSize = lotSize.stepSize;
    return stepSize.split('.')[1].replace(/0+$/, '').length;
  }

  return asset.quoteAssetPrecision;
};

const CANDLES_LIMIT = 1000;

export const loadCandles = async () => {
  const startTime = Date.now();

  const binanceAssets = await binanceHttpClient.fetchAssets();
  const binanceAssets24HrStats = await binanceHttpClient.getAssets24HrStats();
  const savedAssets = await Asset.findAll();

  const binanceAssetsSymbols = binanceAssets.map((asset) => asset.symbol);
  const savedAssetsSymbols = savedAssets.map((asset) => asset.symbol);

  const newAssetsSymbols = binanceAssetsSymbols.filter(
    (item) => !savedAssetsSymbols.includes(item),
  );

  // Удаляем все существующие активы
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
            const candles = await binanceHttpClient.fetchAssetCandles({
              symbol,
              timeframe,
              limit: CANDLES_LIMIT,
            });

            await Candle.bulkCreate(
              candles.map((candle) => ({
                ...candle,
                symbol,
                timeframe,
              })),
            );
            console.log(`Сохранено ${candles.length} свечей для ${symbol} (${timeframe})`);

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
              console.log(`Удалена незакрытая свеча для ${symbol} (${timeframe})`);
              startTime = lastCandle.openTime;
            } else {
              startTime = lastCandle.closeTime + 1;
            }

            const limit = Math.ceil((currentTime - startTime) / timeframeToMilliseconds(timeframe));

            const candles = await binanceHttpClient.fetchAssetCandles({
              symbol,
              timeframe,
              limit,
              startTime,
            });

            if (candles.length > 0) {
              Candle.bulkCreate(
                candles.map((candle) => ({
                  ...candle,
                  symbol,
                  timeframe,
                })),
                {
                  ignoreDuplicates: true,
                },
              );
              console.log(`Догружено ${candles.length} свечей для ${symbol} (${timeframe})`);
            }
          } else {
            const candles = await binanceHttpClient.fetchAssetCandles({
              symbol,
              timeframe,
              limit: CANDLES_LIMIT,
            });
            if (candles.length > 0) {
              Candle.bulkCreate(
                candles.map((candle) => ({
                  ...candle,
                  symbol,
                  timeframe,
                })),
                {
                  ignoreDuplicates: true,
                },
              );
              console.log(`Сохранено ${candles.length} свечей для ${symbol} (${timeframe})`);
            }
          }
        }),
      );

      console.log(`Обработан символ ${symbol}`);
    }

    console.log(`Обработано ${binanceAssetsSymbols.length} активов`);
  } catch (error) {
    console.error('Ошибка при обновлении базы данных:', error);
  }

  console.log(`Обновление базы данных завершено за ${(Date.now() - startTime) / 1000}s`);
};
