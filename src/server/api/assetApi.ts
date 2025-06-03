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
    const limit = Number(req.query.limit) || 1000;

    const assetCandles = await getAssetCandles(symbol, timeframe, limit);
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
