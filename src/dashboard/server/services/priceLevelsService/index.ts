import * as R from 'remeda';

import BinanceHTTPClient from '../../../../trading/providers/Binance/BinanceHTTPClient';
import PriceLevels from '../../../../trading/indicators/PriceLevels/PriceLevels';
import { TTimeframe, TKline } from '../../../../trading/types';
import { getPricePrecision } from '../../../../trading/utils/asset';
import { fetchCachedHistoricalKlines } from '../assetService';

const binanceHttpClient = BinanceHTTPClient.getInstance();

export const getAssetPriceLevels = async (symbol: string) => {
  const TIMEFRAMES: TTimeframe[] = ['1m', '15m', '1h', '4h', '1d'];
  const CANDLE_LIMIT = 1000;

  try {
    const asset = await binanceHttpClient.fetchAssetInfo(symbol);
    const precision = getPricePrecision(asset);

    const timeframeKlines = await Promise.all(
      TIMEFRAMES.map((timeframe) =>
        fetchCachedHistoricalKlines(asset.symbol, timeframe, CANDLE_LIMIT),
      ),
    );

    const timeframeKlinesMap = R.fromEntries(R.zip(TIMEFRAMES, timeframeKlines)) as Record<
      TTimeframe,
      TKline[]
    >;

    const priceLevels = new PriceLevels(asset, precision);
    const supportLevels = priceLevels.calculateSupportLevels(timeframeKlinesMap);
    const resistanceLevels = priceLevels.calculateResistanceLevels(timeframeKlinesMap);

    return {
      supportLevels,
      resistanceLevels,
    };
  } catch (error) {
    console.error('Error fetching price levels:', error);
    throw error;
  }
};
