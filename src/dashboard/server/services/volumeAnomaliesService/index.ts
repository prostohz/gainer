import BinanceStreamClient, {
  TBinanceTrade,
  TBinanceBookTicker,
} from '../../../../trading/providers/Binance/BinanceStreamClient';
import BinanceHTTPClient from '../../../../trading/providers/Binance/BinanceHTTPClient';
import VolumeAnomalies from '../../../../trading/indicators/VolumeAnomalies/VolumeAnomalies';
import { TTradeBuffer } from '../../../../trading/indicators/VolumeAnomalies/types';
import { TTimeframe } from '../../../../trading/types';
import { roundTo } from '../../../../trading/utils/math';
import { AssetRepository } from '../../repositories/AssetRepository';
import { CandleRepository } from '../../repositories/CandleRepository';

const assetRepository = AssetRepository.getInstance();
const candleRepository = CandleRepository.getInstance();

(async () => {
  const TICKER = 'OMUSDT';
  const TIMEFRAME: TTimeframe = '1m';
  const CANDLE_LIMIT = 1000;

  const binanceStreamClient = BinanceStreamClient.getInstance();
  const binanceHttpClient = BinanceHTTPClient.getInstance();

  const asset = assetRepository.getAsset(TICKER);

  if (!asset) {
    throw new Error(`Asset ${TICKER} not found`);
  }

  const assetPrice = await binanceHttpClient.fetchAssetPrice(TICKER);
  const candles = candleRepository.getCandles(asset.symbol, TIMEFRAME, CANDLE_LIMIT);

  const pricePrecision = asset.precision;
  const volumePrecision = asset.volumePrecision;

  let tradeBuffer: TTradeBuffer = {
    trades: [],
    book: null,
    lastPrice: assetPrice,
  };
  let lastTradeTimestamp: number | null = null;

  const volumeAnomalies = new VolumeAnomalies(TIMEFRAME, candles);

  binanceStreamClient.on('trade', (trade: TBinanceTrade) => {
    // Получаем временную метку в секундах (округляем до секунд)
    const tradeTimestampSeconds = Math.floor(trade.T / 1000);

    // Если это первая сделка или сделка в той же секунде, добавляем в буфер
    if (lastTradeTimestamp === null || tradeTimestampSeconds === lastTradeTimestamp) {
      tradeBuffer.trades.push(trade);
      lastTradeTimestamp = tradeTimestampSeconds;
    } else {
      // Если это новая секунда, проверяем аномалии для предыдущего буфера
      if (tradeBuffer.book && tradeBuffer.trades.length > 0) {
        const potentialAnomaly = volumeAnomalies.checkAnomalyVolume(tradeBuffer);
        if (potentialAnomaly.isAnomaly) {
          const volume = tradeBuffer.trades
            .reduce((sum, t) => sum + parseFloat(t.q), 0)
            .toFixed(volumePrecision);

          console.log(`${new Date(trade.T).toLocaleString()}`);
          console.log(
            `Объем: ${volume}\nИзменение цены: ${roundTo(potentialAnomaly.priceChange, 5)}%`,
          );
          console.log(`Последняя цена: ${roundTo(potentialAnomaly.lastPrice, pricePrecision)}`);
          console.log(
            `Последняя сделка: ${roundTo(potentialAnomaly.lastTradePrice, pricePrecision)}`,
          );
          console.log(
            `Продажа: ${roundTo(potentialAnomaly.askPrice, pricePrecision)} Покупка: ${roundTo(
              potentialAnomaly.bidPrice,
              pricePrecision,
            )}`,
          );
          console.log('--------------------------------');
        }
      }

      // Сбрасываем буфер и начинаем новый с текущей сделки
      tradeBuffer = {
        trades: [trade],
        book: tradeBuffer.book,
        lastPrice: parseFloat(trade.p),
      };
      lastTradeTimestamp = tradeTimestampSeconds;
    }
  });

  binanceStreamClient.on('bookTicker', (bookTicker: TBinanceBookTicker) => {
    tradeBuffer.book = bookTicker;
  });

  binanceStreamClient.subscribeMultiple([
    { type: 'trade', symbol: asset.symbol },
    { type: 'bookTicker', symbol: asset.symbol },
  ]);
})();
