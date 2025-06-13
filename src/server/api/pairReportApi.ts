import express, { Request, Response } from 'express';

import { TTimeframe } from '../../shared/types';
import {
  getReportList,
  getReport,
  createReport,
  deleteReport,
} from '../services/pairReportService';
import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const reportList = await getReportList();
    sendResponse(res, reportList);
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

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await deleteReport(id);
    sendResponse(res, { message: 'Report deleted' });
  }),
);

router.post(
  '/',
  validateParams(['timeframe', 'date']),
  asyncHandler(async (req: Request, res: Response) => {
    const timeframe = req.query.timeframe as TTimeframe;
    const date = Number(req.query.date);

    await createReport(timeframe, date);
    sendResponse(res, { message: 'Report built' });
  }),
);

export default router;
