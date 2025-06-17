import express, { Request, Response } from 'express';

import {
  getReportList,
  getReport,
  createReport,
  updateReport,
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

router.post(
  '/',
  validateParams(['date']),
  asyncHandler(async (req: Request, res: Response) => {
    const date = Number(req.query.date);

    await createReport(date);
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

export default router;
