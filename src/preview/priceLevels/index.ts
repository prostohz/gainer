import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';

import BinanceHTTPClient from '../../trading/providers/Binance/BinanceHTTPClient';
import PriceLevels from '../../trading/indicators/PriceLevels/PriceLevels';
import { TKline, TPriceLevelsTimeframe, TTimeframe } from '../../trading/types';
import { getPricePrecision } from '../../trading/utils/asset';

(async () => {
  const TICKER = 'OMUSDT';
  const TIMEFRAMES: TTimeframe[] = ['1m', '15m', '1h', '4h', '1d'];
  const CANDLE_LIMIT = 1000;

  const binanceHttpClient = BinanceHTTPClient.getInstance();

  const asset = await binanceHttpClient.fetchExchangeInfo(TICKER);
  const precision = getPricePrecision(asset);

  const timeframeKlines = await Promise.all(
    TIMEFRAMES.map((timeframe) =>
      binanceHttpClient.fetchHistoricalKlines(asset.symbol, timeframe, CANDLE_LIMIT),
    ),
  );

  const timeframeKlinesMap = _.zipObject(TIMEFRAMES, timeframeKlines) as Record<
    TPriceLevelsTimeframe,
    TKline[]
  >;

  const supportLevels = PriceLevels.calculateSupportLevels(timeframeKlinesMap);
  const resistanceLevels = PriceLevels.calculateResistanceLevels(timeframeKlinesMap);

  const filePath = path.join(__dirname, 'data.json');
  const dataToSave = {
    asset,
    precision,
    timeframeKlines: timeframeKlinesMap,
    supportLevels,
    resistanceLevels,
  };

  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
})();
