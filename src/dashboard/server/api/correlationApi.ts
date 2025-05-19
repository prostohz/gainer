import express, { Request, Response } from 'express';

import { TCorrelation } from '../services/correlationService/types';
import {
  hasCorrelationReport,
  getCorrelationReport,
  buildCorrelationReport,
  getCorrelationReportClusters,
  getPairCorrelation,
  getPairWiseZScore,
} from '../services/correlationService';
import { TTimeframe } from '../../../trading/types';

const router = express.Router();

router.get('/report/has', async (req: Request, res: Response) => {
  const hasReport = await hasCorrelationReport();

  res.json(hasReport);
});

router.get('/report', async (req: Request, res: Response) => {
  const report = await getCorrelationReport();

  res.json(report);
});

router.post('/report/build', async (req: Request, res: Response) => {
  await buildCorrelationReport();

  res.json({ message: 'Report built' });
});

router.get('/clusters', async (req: Request, res: Response) => {
  const usdtOnly = req.query.usdtOnly === 'true';
  const minCorrelation = Number(req.query.minCorrelation);
  const minVolume = Number(req.query.minVolume);

  const correlationReportClusters = await getCorrelationReportClusters(
    usdtOnly,
    minCorrelation,
    minVolume,
  );

  res.json(correlationReportClusters);
});

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
