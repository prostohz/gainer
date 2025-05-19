import express from 'express';

import assetApi from './assetApi';
import correlationApi from './correlationApi';
import priceLevelsApi from './priceLevelsApi';

const router = express.Router();

router.use('/asset', assetApi);
router.use('/correlation', correlationApi);
router.use('/priceLevels', priceLevelsApi);

export default router;
