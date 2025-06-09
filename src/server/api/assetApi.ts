import express, { Request, Response } from 'express';

import { TTimeframe } from '../../shared/types';
import { getAssetList, getAssetCandles, getAssetPrice } from '../services/assetService';
import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';

const router = express.Router();

router.get(
  '/list',
  asyncHandler(async (req: Request, res: Response) => {
    const assets = await getAssetList();
    sendResponse(res, assets);
  }),
);

router.get(
  '/candles',
  validateParams(['symbol', 'timeframe']),
  asyncHandler(async (req: Request, res: Response) => {
    const symbol = req.query.symbol as string;
    const timeframe = req.query.timeframe as TTimeframe;
    const startTimestamp = req.query.startTimestamp ? Number(req.query.startTimestamp) : undefined;
    const endTimestamp = req.query.endTimestamp ? Number(req.query.endTimestamp) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const assetCandles = await getAssetCandles({
      symbol,
      timeframe,
      startTimestamp,
      endTimestamp,
      limit,
    });
    sendResponse(res, assetCandles);
  }),
);

router.get(
  '/price',
  validateParams(['symbol']),
  asyncHandler(async (req: Request, res: Response) => {
    const symbol = req.query.symbol as string;

    const price = await getAssetPrice(symbol);
    sendResponse(res, price);
  }),
);

export default router;
