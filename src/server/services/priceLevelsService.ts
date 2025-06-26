import * as R from 'remeda';

import { PriceLevels } from '../trading/indicators/PriceLevels/PriceLevels';
import { Asset } from '../models/Asset';
import { Candle } from '../models/Candle';

export const getAssetPriceLevels = async (symbol: string) => {
  const TIMEFRAMES = ['1m', '15m', '1h', '4h', '1d'] as const;
  const CANDLE_LIMIT = 1000;

  try {
    const asset = await Asset.findOne({
      where: {
        symbol,
      },
    });

    if (!asset) {
      throw new Error(`Asset ${symbol} not found`);
    }

    const timeframeCandles = await Promise.all(
      TIMEFRAMES.map(async (timeframe) => {
        const candles = await Candle.findAll({
          where: {
            symbol: asset.symbol,
            timeframe,
          },
          order: [['openTime', 'DESC']],
          limit: CANDLE_LIMIT,
        });

        candles.reverse();

        return candles.map((candle) => ({
          openTime: candle.openTime,
          closeTime: candle.closeTime,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
          volume: Number(candle.volume),
        }));
      }),
    );

    const timeframeCandlesMap = R.fromEntries(R.zip(TIMEFRAMES, timeframeCandles));

    const priceLevels = new PriceLevels(asset.pricePrecision);
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
