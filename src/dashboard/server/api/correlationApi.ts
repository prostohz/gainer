import express, { Request, Response } from 'express';

import { TCorrelation } from '../services/correlationService/types';
import {
  getPairCorrelation,
  getCorrelationReport,
  buildCorrelationReport,
} from '../services/correlationService';

const router = express.Router();

router.get('/pair', async (req: Request, res: Response<TCorrelation>) => {
  const symbolA = req.query.symbolA as string;
  const symbolB = req.query.symbolB as string;

  const correlationResult = await getPairCorrelation(symbolA, symbolB);

  res.json(correlationResult);
});

router.get('/report', async (req: Request, res: Response) => {
  const report = await getCorrelationReport();
  res.json(report);
});

router.post('/build', async (req: Request, res: Response) => {
  await buildCorrelationReport();
  res.json({ message: 'Report built' });
});

export default router;
