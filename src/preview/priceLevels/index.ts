import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';

import BinanceHTTPClient, {
  TExchangeInfoSymbol,
  TFilter,
} from '../../trading/providers/Binance/BinanceHTTPClient';
import PriceLevels from '../../trading/indicators/PriceLevels';

const calculatePrecision = (asset: TExchangeInfoSymbol): number => {
  const priceFilter = asset.filters.find((filter: TFilter) => filter.filterType === 'PRICE_FILTER');
  if (priceFilter) {
    const tickSize = priceFilter.tickSize;

    if (tickSize && tickSize.includes('.')) {
      return tickSize.split('.')[1].replace(/0+$/, '').length;
    }
  }

  return asset.baseAssetPrecision;
};

(async () => {
  const TICKER = 'BTCUSDT';
  const TIME_FRAMES = ['1m', '15m', '1h', '4h', '1d'];
  const CANDLE_LIMIT = 1000;

  const binanceHttpClient = BinanceHTTPClient.getInstance();

  const asset = await binanceHttpClient.fetchExchangeInfo(TICKER);
  const precision = calculatePrecision(asset);

  const timeFrameKlines = await Promise.all(
    TIME_FRAMES.map((interval) =>
      binanceHttpClient.fetchHistoricalKlines(asset.symbol, interval, CANDLE_LIMIT),
    ),
  );

  const timeFrameKlinesMap = _.zipObject(TIME_FRAMES, timeFrameKlines);

  const supportLevels = PriceLevels.calculateSupportLevels(timeFrameKlinesMap);
  const resistanceLevels = PriceLevels.calculateResistanceLevels(timeFrameKlinesMap);

  const filePath = path.join(__dirname, 'data.json');
  const dataToSave = {
    asset,
    precision,
    timeFrameKlines: timeFrameKlinesMap,
    supportLevels,
    resistanceLevels,
  };

  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
})();
