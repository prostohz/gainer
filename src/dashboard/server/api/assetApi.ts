import express, { Request, Response } from 'express';

import { getAssetList, getAssetKlines, getAssetPrice } from '../services/assetService';
import { TTimeframe } from '../../../trading/types';

const router = express.Router();

router.get('/list', async (req: Request, res: Response) => {
  try {
    const assets = await getAssetList();
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.get('/klines', async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    const timeframe = req.query.timeframe as TTimeframe;
    const limit = Number(req.query.limit) || 1000;
    const assetKlines = await getAssetKlines(symbol, timeframe, limit);

    res.json(assetKlines);
  } catch (error) {
    console.error('Error fetching asset klines:', error);
    res.status(500).json({ error: 'Failed to fetch asset klines' });
  }
});

router.get('/price', async (req: Request, res: Response) => {
  const symbol = req.query.symbol as string;
  const price = await getAssetPrice(symbol);
  res.json(price);
});

export default router;
