import express, { Request, Response } from 'express';

import { getPairCorrelation } from '../services/correlationService';
import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';

const router = express.Router();

router.get(
  '/pair',
  validateParams(['symbolA', 'symbolB', 'date']),
  asyncHandler(async (req: Request, res: Response) => {
    const symbolA = req.query.symbolA as string;
    const symbolB = req.query.symbolB as string;
    const date = Number(req.query.date);

    const correlationResult = await getPairCorrelation(symbolA, symbolB, date);
    sendResponse(res, correlationResult);
  }),
);

export default router;
