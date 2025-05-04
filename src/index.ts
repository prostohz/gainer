import BinanceWebSocketClient from './providers/Binance/Binance';

const binance = BinanceWebSocketClient.getInstance();

binance.connect();

binance.subscribe('ticker', { symbol: 'BTCUSDT' });
