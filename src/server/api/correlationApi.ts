import express, { Request, Response } from 'express';

import { TTimeframe, TCorrelation } from '../../shared/types';
import { getPairCorrelation, getPairWiseZScore } from '../services/correlationService';

const router = express.Router();

router.get('/pair', async (req: Request, res: Response<TCorrelation>) => {
  const symbolA = req.query.symbolA as string;
  const symbolB = req.query.symbolB as string;

  const correlationResult = await getPairCorrelation(symbolA, symbolB);

  res.json(correlationResult);
});

router.get('/pairwiseZScore', async (req: Request, res: Response<Record<string, number>>) => {
  const symbols = req.query['symbols[]'] as string[];
  const timeframe = req.query.timeframe as TTimeframe;

  const zScore = await getPairWiseZScore(symbols, timeframe);

  res.json(zScore);
});

export default router;
