import express, { Request, Response } from 'express';

import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';
import { backtest } from '../services/backtestService';

const router = express.Router();

router.post(
  '/',
  validateParams(['pairs', 'startTimestamp', 'endTimestamp']),
  asyncHandler(async (req: Request, res: Response) => {
    const pairsParam = req.body.pairs as string[];
    const startTimestampParam = req.body.startTimestamp as string;
    const endTimestampParam = req.body.endTimestamp as string;

    const pairs = Array.isArray(pairsParam) ? pairsParam : [pairsParam];
    const startTimestamp = Number(startTimestampParam);
    const endTimestamp = Number(endTimestampParam);

    const result = await backtest(pairs, startTimestamp, endTimestamp);

    sendResponse(res, result);
  }),
);

export default router;
