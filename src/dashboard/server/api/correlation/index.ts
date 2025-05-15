import express, { Request, Response } from 'express';
import * as R from 'remeda';

import BinanceHTTPClient from '../../../../trading/providers/Binance/BinanceHTTPClient';

import { Correlation } from '../../../../trading/indicators/Correlation/Correlation';
import { TKline, TPriceLevelsTimeframe, TTimeframe } from '../../../../trading/types';
import { TCorrelation } from './types';

const TIMEFRAMES: TTimeframe[] = ['1m', '15m', '1h', '4h', '1d'];
const CANDLE_LIMIT = 1000;

const getCorrelation = async (req: Request, res: Response<TCorrelation>) => {
  const binanceHttpClient = BinanceHTTPClient.getInstance();

  const symbolA = req.query.symbolA as string;
  const symbolB = req.query.symbolB as string;

  const assetA = await binanceHttpClient.fetchExchangeInfo(symbolA);
  const assetB = await binanceHttpClient.fetchExchangeInfo(symbolB);

  const [timeframeKlinesA, timeframeKlinesB] = await Promise.all([
    Promise.all(
      TIMEFRAMES.map((timeframe) =>
        binanceHttpClient.fetchHistoricalKlines(assetA.symbol, timeframe, CANDLE_LIMIT),
      ),
    ),
    Promise.all(
      TIMEFRAMES.map((timeframe) =>
        binanceHttpClient.fetchHistoricalKlines(assetB.symbol, timeframe, CANDLE_LIMIT),
      ),
    ),
  ]);

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

  res.json(correlationResult);
};

const router = express.Router();
router.get('/', getCorrelation);

export default router;
