import express, { Request, Response } from 'express';

import { getAssets } from '../services/assetsService';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const assets = await getAssets();
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

export default router;
