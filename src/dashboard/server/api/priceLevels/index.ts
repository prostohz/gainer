import * as R from 'remeda';
import express, { Request, Response } from 'express';

import BinanceHTTPClient from '../../../../trading/providers/Binance/BinanceHTTPClient';
import PriceLevels from '../../../../trading/indicators/PriceLevels/PriceLevels';
import { TKline, TPriceLevelsTimeframe, TTimeframe } from '../../../../trading/types';
import { getPricePrecision } from '../../../../trading/utils/asset';
import { TPriceLevels } from './types';

const TIMEFRAMES: TTimeframe[] = ['1m', '15m', '1h', '4h', '1d'];
const CANDLE_LIMIT = 1000;

const getPriceLevels = async (req: Request, res: Response<TPriceLevels | { error: string }>) => {
  try {
    const symbol = req.query.symbol as string;

    const binanceHttpClient = BinanceHTTPClient.getInstance();

    const asset = await binanceHttpClient.fetchExchangeInfo(symbol);
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

    res.json({
      asset,
      precision,
      supportLevels,
      resistanceLevels,
      timeframeKlines: timeframeKlinesMap,
    });
  } catch (error) {
    console.error('Error fetching price levels:', error);
    res.status(500).json({ error: 'Failed to fetch price levels' });
  }
};

const router = express.Router();
router.get('/', getPriceLevels);

export default router;
