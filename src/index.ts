import BinanceHTTPClient from './providers/Binance/BinanceHTTPClient';
import BinanceCombinedStreamClient, {
  TStreamSubscription,
  TBinanceTrade,
  TBinanceBookTicker,
  TBinanceDepth,
} from './providers/Binance/BinanceCombinedStreamClient';
import SupportLevels from './math/SupportLevels';

const binanceClient = BinanceCombinedStreamClient.getInstance();
const binanceHttpClient = BinanceHTTPClient.getInstance();

const TRADED_TICKERS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const CANDLE_INTERVALS = ['5m', '1d'];
const CANDLE_LIMIT = 100;
const DEPTH_LIMIT = 10;

TRADED_TICKERS.forEach((ticker) => {
  CANDLE_INTERVALS.forEach((interval) => {
    binanceHttpClient.fetchHistoricalKlines(ticker, interval, CANDLE_LIMIT).then((klines) => {
      console.log(`Получено ${klines.length} исторических ${interval} свечей для ${ticker}`);

      const supportLevels = SupportLevels.calculateSupportLevels(klines);
      console.log('Уровни поддержки:', supportLevels);
    });
  });
});

const streams: TStreamSubscription[] = [];

TRADED_TICKERS.forEach((ticker) => {
  streams.push(
    { type: 'trade', symbol: ticker },
    { type: 'bookTicker', symbol: ticker },
    { type: 'depth', symbol: ticker, depth: DEPTH_LIMIT },
  );
});

binanceClient.subscribeMultiple(streams);

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

binanceClient.on('depth', (data: TBinanceDepth) => {
  console.log(`Глубина стакана ${data.s} (обновление ${data.u}):`);

  if (data.b && data.b.length) {
    console.log('  Покупки (Bid):');
    data.b.slice(0, 3).forEach((bid, index) => {
      console.log(`    ${index + 1}. Цена: ${bid[0]}, Объем: ${bid[1]}`);
    });
  }

  if (data.a && data.a.length) {
    console.log('  Продажи (Ask):');
    data.a.slice(0, 3).forEach((ask, index) => {
      console.log(`    ${index + 1}. Цена: ${ask[0]}, Объем: ${ask[1]}`);
    });
  }
});

process.on('SIGINT', () => {
  binanceClient.disconnect();
  process.exit(0);
});
