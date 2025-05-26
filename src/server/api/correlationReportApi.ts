import express, { Request, Response } from 'express';

import { TTimeframe } from '../../shared/types';
import {
  hasReport,
  getReport,
  buildReport,
  getReportClusters,
} from '../services/correlationReportService';

const router = express.Router();

router.get('/has', async (req: Request, res: Response) => {
  const timeframe = req.query.timeframe as TTimeframe;
  const reportExists = await hasReport(timeframe);

  res.json(reportExists);
});

router.get('/', async (req: Request, res: Response) => {
  const timeframe = req.query.timeframe as TTimeframe;
  const report = await getReport(timeframe);

  res.json(report);
});

router.post('/build', async (req: Request, res: Response) => {
  const timeframe = req.query.timeframe as TTimeframe;
  await buildReport(timeframe);

  res.json({ message: 'Report built' });
});

router.get('/clusters', async (req: Request, res: Response) => {
  const timeframe = req.query.timeframe as TTimeframe;
  const usdtOnly = req.query.usdtOnly === 'true';
  const maxPValue = Number(req.query.maxPValue);
  const minVolume = Number(req.query.minVolume);

  const correlationReportClusters = await getReportClusters(
    timeframe,
    usdtOnly,
    maxPValue,
    minVolume,
  );

  res.json(correlationReportClusters);
});

export default router;
