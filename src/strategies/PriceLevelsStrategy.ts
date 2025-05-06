import BinanceHTTPClient, {
  TExchangeInfoSymbol,
  TFilter,
} from '../providers/Binance/BinanceHTTPClient';
import BinanceCombinedStreamClient, {
  TStreamSubscription,
  TBinanceTrade,
  TBinanceBookTicker,
} from '../providers/Binance/BinanceCombinedStreamClient';
import PriceLevels from '../indicators/PriceLevels';

/**
 * Вычисляет точность (precision) на основе данных актива
 * @param asset объект с информацией об активе
 * @returns вычисленная точность (precision)
 */
const calculatePrecision = (asset: TExchangeInfoSymbol): number => {
  const priceFilter = asset.filters.find((filter: TFilter) => filter.filterType === 'PRICE_FILTER');

  if (priceFilter && priceFilter.filterType === 'PRICE_FILTER') {
    const tickSize = priceFilter?.tickSize;

    if (tickSize && tickSize.includes('.')) {
      return tickSize.split('.')[1].replace(/0+$/, '').length;
    }
  }

  return asset.baseAssetPrecision;
};

export const trade = async () => {
  const binanceClient = BinanceCombinedStreamClient.getInstance();
  const binanceHttpClient = BinanceHTTPClient.getInstance();

  const TRADED_ASSETS_TICKERS = ['KERNELUSDT'];
  const CANDLE_INTERVALS = ['1m'];
  const CANDLE_LIMIT = 100;

  binanceClient.on('error', (error) => {
    console.error('Ошибка WebSocket:', error);
  });

  binanceClient.on('trade', (data: TBinanceTrade) => {
    console.log(
      `Сделка ${data.s}: Цена: ${data.p}, Количество: ${data.q}, Время: ${new Date(data.T).toISOString()}`,
    );
  });

  binanceClient.on('bookTicker', (data: TBinanceBookTicker) => {
    console.log(
      `Стакан ${data.s}: Лучшая цена покупки: ${data.b}, Объем: ${data.B}, Лучшая цена продажи: ${data.a}, Объем: ${data.A}`,
    );
  });

  const assets = await Promise.all(
    TRADED_ASSETS_TICKERS.map(async (ticker) => {
      const assetInfo = await binanceHttpClient.fetchExchangeInfo(ticker);
      const currentPrice = await binanceHttpClient.fetchCurrentPrice(ticker);
      return {
        ...assetInfo,
        currentPrice,
      };
    }),
  );

  assets.forEach((item) => {
    CANDLE_INTERVALS.forEach((interval) => {
      binanceHttpClient
        .fetchHistoricalKlines(item.symbol, interval, CANDLE_LIMIT)
        .then((klines) => {
          const precision = calculatePrecision(item);
          const supportLevels = PriceLevels.calculateSupportLevels(
            klines,
            precision,
            item.currentPrice,
          );

          console.log('Уровни поддержки:', supportLevels);
        })
        .catch((error) => {
          console.error(`Ошибка при получении исторических свечей: ${error}`);
        });
    });
  });

  const streams: TStreamSubscription[] = assets.reduce<TStreamSubscription[]>(
    (acc, item) =>
      item
        ? [
            ...acc,
            { type: 'trade', symbol: item.symbol },
            { type: 'bookTicker', symbol: item.symbol },
          ]
        : acc,
    [],
  );

  // binanceClient.subscribeMultiple(streams);
};
