import BinanceHTTPClient from '../providers/Binance/BinanceHTTPClient';
import BinanceCombinedStreamClient, {
  TStreamSubscription,
  TBinanceTrade,
  TBinanceBookTicker,
} from '../providers/Binance/BinanceCombinedStreamClient';

export const trade = async () => {
  const binanceClient = BinanceCombinedStreamClient.getInstance();
  const binanceHttpClient = BinanceHTTPClient.getInstance();

  const TRADED_ASSETS_TICKERS = ['BTCUSDT'];

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

  binanceClient.subscribeMultiple(streams);
};
