import * as fs from 'fs';
import * as path from 'path';
import * as R from 'remeda';

import BinanceHTTPClient from '../../trading/providers/Binance/BinanceHTTPClient';
import PriceLevels from '../../trading/indicators/PriceLevels/PriceLevels';
import { TKline, TPriceLevelsTimeframe, TTimeframe } from '../../trading/types';
import { getPricePrecision } from '../../trading/utils/asset';

(async () => {
  const TICKER = 'KERNELUSDT';
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

  const timeframeKlinesMap = R.fromEntries(R.zip(TIMEFRAMES, timeframeKlines)) as Record<
    TPriceLevelsTimeframe,
    TKline[]
  >;

  const priceLevels = new PriceLevels(asset, precision);

  const supportLevels = priceLevels.calculateSupportLevels(timeframeKlinesMap);
  const resistanceLevels = priceLevels.calculateResistanceLevels(timeframeKlinesMap);

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
