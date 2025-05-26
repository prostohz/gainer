import BinanceHTTPClient from '../../providers/Binance/BinanceHTTPClient';
import BinanceStreamClient from '../../providers/Binance/BinanceStreamClient';
import { MeanReversionStrategy, TSignal } from './strategy';

const strategy = new MeanReversionStrategy('BTCUSDT', 'ETHUSDT', '1m', {
  dataProvider: BinanceHTTPClient.getInstance(),
  streamDataProvider: new BinanceStreamClient(),
});

strategy.on('signal', (signal: TSignal) => {
  console.log('Получен торговый сигнал:', signal);
});

strategy.start();
strategy.stop();
