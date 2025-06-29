import { BinanceHTTPClient } from '../../providers/Binance/spot/BinanceHTTPClient';
import { BinanceStreamClient } from '../../providers/Binance/spot/BinanceStreamClient';
import { MeanReversionStrategy, TSignal } from './strategy';

const strategy = new MeanReversionStrategy({
  dataProvider: BinanceHTTPClient.getInstance(),
  streamDataProvider: new BinanceStreamClient(),
});

strategy.on('signal', (signal: TSignal) => {
  console.log('Получен торговый сигнал:', signal);
});

strategy.start({ baseAsset: 'BTC', quoteAsset: 'USDT' }, { baseAsset: 'ETH', quoteAsset: 'USDT' });
strategy.stop();
