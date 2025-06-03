import express, { Request, Response } from 'express';

import { loadCandles } from '../services/systemService';
import { asyncHandler, sendResponse } from '../utils/apiHandler';

const router = express.Router();

router.post(
  '/loadCandles',
  asyncHandler(async (req: Request, res: Response) => {
    await loadCandles();
    sendResponse(res, { message: 'Candles loaded successfully' });
  }),
);

export default router;
