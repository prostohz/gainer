import express, { Request, Response } from 'express';

import { getPriceLevels } from '../services/priceLevelsService';
import { TPriceLevels } from '../services/priceLevelsService/types';

const router = express.Router();

router.get('/', async (req: Request, res: Response<TPriceLevels | { error: string }>) => {
  try {
    const symbol = req.query.symbol as string;
    const priceLevels = await getPriceLevels(symbol);

    res.json(priceLevels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price levels' });
  }
});

export default router;
