import express from 'express';

import assets from './assetsApi';
import priceLevels from './priceLevelsApi';
import correlation from './correlationApi';

const router = express.Router();

router.use('/assets', assets);
router.use('/priceLevels', priceLevels);
router.use('/correlation', correlation);

export default router;
