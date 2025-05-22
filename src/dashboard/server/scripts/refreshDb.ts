import * as R from 'remeda';

import BinanceHTTPClient, {
  TExchangeInfoSymbol,
  TFilter,
} from '../../../trading/providers/Binance/BinanceHTTPClient';
import { TTimeframe } from '../../../trading/types';
import { timeframeToMilliseconds } from '../../../trading/utils/timeframe';
import { AssetRepository } from '../repositories/AssetRepository';
import { CandleRepository } from '../repositories/CandleRepository';

const binanceHttpClient = BinanceHTTPClient.getInstance();

const assetRepository = AssetRepository.getInstance();
const candleRepository = CandleRepository.getInstance();

export const getAssetPricePrecision = (asset: TExchangeInfoSymbol): number => {
  const priceFilter = asset.filters.find((filter: TFilter) => filter.filterType === 'PRICE_FILTER');
  if (priceFilter) {
    const tickSize = priceFilter.tickSize;

    if (tickSize && tickSize.includes('.')) {
      return tickSize.split('.')[1].replace(/0+$/, '').length;
    }
  }

  return asset.baseAssetPrecision;
};

export const getAssetVolumePrecision = (asset: TExchangeInfoSymbol): number => {
  const lotSize = asset.filters.find((filter: TFilter) => filter.filterType === 'LOT_SIZE');
  if (lotSize) {
    const stepSize = lotSize.stepSize;
    return stepSize.split('.')[1].replace(/0+$/, '').length;
  }

  return asset.quoteAssetPrecision;
};

const CANDLES_LIMIT = 1000;

(async () => {
  const binanceAssets = await binanceHttpClient.fetchAssets();
  const binanceAssets24HrStats = await binanceHttpClient.getAssets24HrStats();
  const savedAssets = await assetRepository.getAssets();

  const binanceAssetsSymbols = binanceAssets.map((asset) => asset.symbol);
  const savedAssetsSymbols = savedAssets.map((asset) => asset.symbol);

  const newAssetsSymbols = binanceAssetsSymbols.filter(
    (item) => !savedAssetsSymbols.includes(item),
  );

  // Удаляем все существующие активы
  assetRepository.deleteAll();

  const assetsToSave = binanceAssets.map((asset) => {
    const assetStats = binanceAssets24HrStats.find((stats) => asset.symbol === stats.symbol)!;

    const precision = getAssetPricePrecision(asset);
    const volumePrecision = getAssetVolumePrecision(asset);

    const usdtVolume = (() => {
      if (asset.baseAsset === 'USDT') {
        return Number(assetStats.quoteVolume);
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
      precision,
      volumePrecision,
      usdtVolume,
    };
  });

  assetRepository.saveAssets(assetsToSave);

  const timeframes: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  const symbolChunks = R.chunk(binanceAssetsSymbols, 2);

  try {
    for (const [chunkIndex, symbolsChunk] of symbolChunks.entries()) {
      // Обрабатываем все символы в чанке параллельно
      await Promise.all(
        symbolsChunk.map(async (symbol) => {
          const isNewAsset = newAssetsSymbols.includes(symbol);
          // Обрабатываем все таймфреймы для символа параллельно
          await Promise.all(
            timeframes.map(async (timeframe) => {
              try {
                if (isNewAsset) {
                  const candles = await binanceHttpClient.fetchAssetCandles(
                    symbol,
                    timeframe,
                    CANDLES_LIMIT,
                  );
                  if (candles.length > 0) {
                    candleRepository.saveCandles(symbol, timeframe, candles);
                    console.log(`Сохранено ${candles.length} свечей для ${symbol} (${timeframe})`);
                  }
                } else {
                  // Для существующих активов догружаем последние свечи
                  // Получаем последнюю сохраненную свечу
                  const [lastCandle] = candleRepository.getCandles(symbol, timeframe, 1, 'DESC');

                  if (lastCandle) {
                    // Проверяем, закрыта ли последняя свеча
                    const currentTime = Date.now();
                    const lastCandleEndTime = lastCandle.closeTime;

                    // Определяем время начала запроса
                    let startTime;

                    // Если последняя свеча ещё не закрыта, удаляем её и начинаем запрос с её времени открытия
                    if (currentTime < lastCandleEndTime) {
                      candleRepository.deleteCandle(symbol, timeframe, lastCandle.openTime);
                      console.log(`Удалена незакрытая свеча для ${symbol} (${timeframe})`);
                      startTime = lastCandle.openTime;
                    } else {
                      startTime = lastCandle.closeTime + 1;
                    }

                    const limit = Math.ceil(
                      (currentTime - startTime) / timeframeToMilliseconds(timeframe),
                    );

                    const candles = await binanceHttpClient.fetchAssetCandles(
                      symbol,
                      timeframe,
                      limit,
                      startTime,
                    );

                    if (candles.length > 0) {
                      candleRepository.saveCandles(symbol, timeframe, candles);
                      console.log(
                        `Догружено ${candles.length} свечей для ${symbol} (${timeframe})`,
                      );
                    }
                  } else {
                    const candles = await binanceHttpClient.fetchAssetCandles(
                      symbol,
                      timeframe,
                      CANDLES_LIMIT,
                    );
                    if (candles.length > 0) {
                      candleRepository.saveCandles(symbol, timeframe, candles);
                      console.log(
                        `Сохранено ${candles.length} свечей для ${symbol} (${timeframe})`,
                      );
                    }
                  }
                }
              } catch (error) {
                console.error(`Ошибка при загрузке свечей для ${symbol} (${timeframe}):`, error);
              }
            }),
          );
        }),
      );

      console.log(
        `Обработан чанк ${chunkIndex + 1}/${symbolChunks.length} (${symbolsChunk.length} активов)`,
      );
    }
  } catch (error) {
    console.error('Ошибка при обновлении базы данных:', error);
  }

  console.log('Обновление базы данных завершено');
})();
