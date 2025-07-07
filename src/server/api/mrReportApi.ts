import express, { Request, Response } from 'express';

import {
  getReportList,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  createReportBacktest,
  deleteReportBacktest,
  getBacktestTradesByPairScore,
} from '../services/mrReportService';
import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const startDate = req.query.startDate ? Number(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? Number(req.query.endDate) : undefined;
    const tagId = req.query.tagId ? Number(req.query.tagId) : undefined;

    const reportList = await getReportList(startDate, endDate, tagId);
    sendResponse(res, reportList);
  }),
);

router.post(
  '/',
  validateParams(['date', 'tagId']),
  asyncHandler(async (req: Request, res: Response) => {
    const date = Number(req.query.date);
    const tagId = Number(req.query.tagId);

    await createReport(date, tagId);
    sendResponse(res, { message: 'Report built' });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const report = await getReport(id);
    sendResponse(res, report);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await updateReport(id);
    sendResponse(res, { message: 'Report updated' });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await deleteReport(id);
    sendResponse(res, { message: 'Report deleted' });
  }),
);

router.post(
  '/:id/backtest',
  validateParams(['startTimestamp', 'endTimestamp']),
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const startTimestamp = Number(req.body.startTimestamp);
    const endTimestamp = Number(req.body.endTimestamp);

    await createReportBacktest(id, startTimestamp, endTimestamp);
    sendResponse(res, { message: 'Report backtested' });
  }),
);

router.delete(
  '/:id/backtest',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await deleteReportBacktest(id);
    sendResponse(res, { message: 'Backtests deleted' });
  }),
);

router.get(
  '/analytics/tradesByPairScore',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getBacktestTradesByPairScore();
    sendResponse(res, result);
  }),
);

export default router;
