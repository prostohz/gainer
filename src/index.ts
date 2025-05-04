import BinanceCombinedStreamClient from './providers/Binance/BinanceCombinedStreamClient';
import { BinanceDepth, BinanceTrade, BinanceBookTicker } from './providers/Binance/types';

const binanceClient = BinanceCombinedStreamClient.getInstance();

binanceClient.on('connected', () => {
  console.log('Соединение с Binance установлено');
});

binanceClient.on('disconnected', () => {
  console.log('Соединение с Binance разорвано');
});

binanceClient.on('error', (error) => {
  console.error('Ошибка WebSocket:', error);
});

binanceClient.on('trade', (data: BinanceTrade) => {
  console.log(
    `Сделка ${data.s}: Цена: ${data.p}, Количество: ${data.q}, Время: ${new Date(data.T).toISOString()}`,
  );
});

binanceClient.on('bookTicker', (data: BinanceBookTicker) => {
  console.log(
    `Стакан ${data.s}: Лучшая цена покупки: ${data.b}, Объем: ${data.B}, Лучшая цена продажи: ${data.a}, Объем: ${data.A}`,
  );
});

binanceClient.on('depth', (data: BinanceDepth) => {
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

binanceClient.subscribeMultiple([
  { type: 'trade', symbol: 'BTCUSDT' },
  { type: 'bookTicker', symbol: 'BTCUSDT' },
  { type: 'depth', symbol: 'BTCUSDT', depth: 10 },
]);

process.on('SIGINT', () => {
  console.log('Закрытие соединения...');
  binanceClient.disconnect();
  process.exit(0);
});
