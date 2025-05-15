import express from 'express';

import assets from './assets';
import priceLevels from './priceLevels';
import correlation from './correlation';

const router = express.Router();

router.use('/assets', assets);
router.use('/priceLevels', priceLevels);
router.use('/correlation', correlation);

export default router;
