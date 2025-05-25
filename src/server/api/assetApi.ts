import express, { Request, Response } from 'express';

import { TTimeframe } from '../../shared/types';
import { getAssetList, getAssetCandles, getAssetPrice } from '../services/assetService';

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

router.get('/candles', async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    const timeframe = req.query.timeframe as TTimeframe;
    const limit = Number(req.query.limit) || 1000;

    const assetCandles = await getAssetCandles(symbol, timeframe, limit);

    res.json(assetCandles);
  } catch (error) {
    console.error('Error fetching asset candles:', error);
    res.status(500).json({ error: 'Failed to fetch asset candles' });
  }
});

router.get('/price', async (req: Request, res: Response) => {
  const symbol = req.query.symbol as string;

  const price = await getAssetPrice(symbol);

  res.json(price);
});

export default router;
