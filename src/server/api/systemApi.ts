import express, { Request, Response } from 'express';

import { flushDatabase, getSystemInfo, loadCandles } from '../services/systemService';
import { asyncHandler, sendResponse } from '../utils/apiHandler';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const systemInfo = await getSystemInfo();
    sendResponse(res, systemInfo);
  }),
);

router.post(
  '/flushDatabase',
  asyncHandler(async (req: Request, res: Response) => {
    await flushDatabase();
    sendResponse(res, { message: 'Database flushed successfully' });
  }),
);

router.post(
  '/loadCandles',
  asyncHandler(async (req: Request, res: Response) => {
    await loadCandles();
    sendResponse(res, { message: 'Candles loaded successfully' });
  }),
);

export default router;
