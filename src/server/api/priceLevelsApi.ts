import express, { Request, Response } from 'express';

import { getAssetPriceLevels } from '../services/priceLevelsService';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const symbol = req.query.symbol as string;
  const priceLevels = await getAssetPriceLevels(symbol);

  res.json(priceLevels);
});

export default router;
