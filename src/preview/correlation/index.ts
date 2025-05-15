import * as R from 'remeda';

import BinanceHTTPClient from '../../trading/providers/Binance/BinanceHTTPClient';

import { Correlation } from '../../trading/indicators/Correlation/Correlation';
import { TKline, TPriceLevelsTimeframe, TTimeframe } from '../../trading/types';

(async () => {
  const binanceHttpClient = BinanceHTTPClient.getInstance();

  const TICKER_A = 'BTCUSDT';
  const TICKER_B = 'OMUSDT';

  const TIMEFRAMES: TTimeframe[] = ['1m', '15m', '1h', '4h', '1d'];
  const CANDLE_LIMIT = 1000;

  const assetA = await binanceHttpClient.fetchExchangeInfo(TICKER_A);
  const assetB = await binanceHttpClient.fetchExchangeInfo(TICKER_B);

  const timeframeKlinesA = await Promise.all(
    TIMEFRAMES.map((timeframe) =>
      binanceHttpClient.fetchHistoricalKlines(assetA.symbol, timeframe, CANDLE_LIMIT),
    ),
  );

  const timeframeKlinesB = await Promise.all(
    TIMEFRAMES.map((timeframe) =>
      binanceHttpClient.fetchHistoricalKlines(assetB.symbol, timeframe, CANDLE_LIMIT),
    ),
  );

  const timeframeKlinesMapA = R.fromEntries(R.zip(TIMEFRAMES, timeframeKlinesA)) as Record<
    TPriceLevelsTimeframe,
    TKline[]
  >;

  const timeframeKlinesMapB = R.fromEntries(R.zip(TIMEFRAMES, timeframeKlinesB)) as Record<
    TPriceLevelsTimeframe,
    TKline[]
  >;

  const correlation = new Correlation();

  const correlationResult = correlation.calculateCorrelation(
    timeframeKlinesMapA,
    timeframeKlinesMapB,
  );

  console.log(correlationResult);
})();
