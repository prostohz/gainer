import express, { Request, Response } from 'express';

import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';
import { backtest } from '../services/backtestService';
import { TTimeframe } from '../../shared/types';

const router = express.Router();

router.post(
  '/',
  validateParams(['symbolA', 'symbolB', 'timeframe', 'startTimestamp', 'endTimestamp']),
  asyncHandler(async (req: Request, res: Response) => {
    const symbolA = req.query.symbolA as string;
    const symbolB = req.query.symbolB as string;
    const timeframe = req.query.timeframe as TTimeframe;
    const startTimestamp = Number(req.query.startTimestamp);
    const endTimestamp = Number(req.query.endTimestamp);

    const result = await backtest(symbolA, symbolB, timeframe, startTimestamp, endTimestamp);

    sendResponse(res, result);
  }),
);

export default router;
