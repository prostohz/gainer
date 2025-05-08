import BinanceHTTPClient from '../providers/Binance/BinanceHTTPClient';
import BinanceStreamClient, {
  TStreamSubscription,
  TBinanceTrade,
  TBinanceBookTicker,
} from '../providers/Binance/BinanceStreamClient';

export const trade = async () => {
  const binanceStreamClient = BinanceStreamClient.getInstance();
  const binanceHttpClient = BinanceHTTPClient.getInstance();

  const TRADED_ASSETS_TICKERS = ['BTCUSDT'];

  binanceStreamClient.on('error', (error) => {
    console.error('Ошибка WebSocket:', error);
  });

  binanceStreamClient.on('trade', (data: TBinanceTrade) => {
    console.log(
      `Сделка ${data.s}: Цена: ${data.p}, Количество: ${data.q}, Время: ${new Date(data.T).toISOString()}`,
    );
  });

  binanceStreamClient.on('bookTicker', (data: TBinanceBookTicker) => {
    console.log(
      `Стакан ${data.s}: Лучшая цена покупки: ${data.b}, Объем: ${data.B}, Лучшая цена продажи: ${data.a}, Объем: ${data.A}`,
    );
  });

  const assets = await Promise.all(
    TRADED_ASSETS_TICKERS.map((ticker) => binanceHttpClient.fetchExchangeInfo(ticker)),
  );

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

  binanceStreamClient.subscribeMultiple(streams);
};
