import express, { Request, Response } from 'express';

import { getAssetPriceLevels } from '../services/priceLevelsService';
import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';

const router = express.Router();

router.get(
  '/',
  validateParams(['symbol']),
  asyncHandler(async (req: Request, res: Response) => {
    const symbol = req.query.symbol as string;

    const priceLevels = await getAssetPriceLevels(symbol);
    sendResponse(res, priceLevels);
  }),
);

export default router;
