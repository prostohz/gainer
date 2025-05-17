import * as R from 'remeda';

import BinanceHTTPClient from '../../../../trading/providers/Binance/BinanceHTTPClient';
import { getPricePrecision } from '../../../../trading/utils/asset';
import { TPriceLevelsTimeframe, TTimeframe, TKline } from '../../../../trading/types';
import PriceLevels from '../../../../trading/indicators/PriceLevels/PriceLevels';

const TIMEFRAMES: TTimeframe[] = ['1m', '15m', '1h', '4h', '1d'];
const CANDLE_LIMIT = 1000;

export const getPriceLevels = async (symbol: string) => {
  try {
    const binanceHttpClient = BinanceHTTPClient.getInstance();

    const asset = await binanceHttpClient.fetchAssetInfo(symbol);
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

    return {
      asset,
      precision,
      supportLevels,
      resistanceLevels,
      timeframeKlines: timeframeKlinesMap,
    };
  } catch (error) {
    console.error('Error fetching price levels:', error);
    throw error;
  }
};
