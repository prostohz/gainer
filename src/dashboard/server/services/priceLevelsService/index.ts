import * as R from 'remeda';

import PriceLevels from '../../../../trading/indicators/PriceLevels/PriceLevels';
import { TTimeframe, TCandle } from '../../../../trading/types';
import { AssetRepository } from '../../repositories/AssetRepository';
import { CandleRepository } from '../../repositories/CandleRepository';

const assetRepository = AssetRepository.getInstance();
const candleRepository = CandleRepository.getInstance();

export const getAssetPriceLevels = async (symbol: string) => {
  const TIMEFRAMES: TTimeframe[] = ['1m', '15m', '1h', '4h', '1d'];
  const CANDLE_LIMIT = 1000;

  try {
    const asset = assetRepository.getAsset(symbol);

    if (!asset) {
      throw new Error(`Asset ${symbol} not found`);
    }

    const timeframeCandles = await Promise.all(
      TIMEFRAMES.map((timeframe) =>
        candleRepository.getCandles(asset.symbol, timeframe, CANDLE_LIMIT),
      ),
    );

    const timeframeCandlesMap = R.fromEntries(R.zip(TIMEFRAMES, timeframeCandles)) as Record<
      TTimeframe,
      TCandle[]
    >;

    const priceLevels = new PriceLevels(asset, asset.precision);
    const supportLevels = priceLevels.calculateSupportLevels(timeframeCandlesMap);
    const resistanceLevels = priceLevels.calculateResistanceLevels(timeframeCandlesMap);

    return {
      supportLevels,
      resistanceLevels,
    };
  } catch (error) {
    console.error('Error fetching price levels:', error);
    throw error;
  }
};
