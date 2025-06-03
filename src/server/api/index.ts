import express from 'express';

import assetApi from './assetApi';
import correlationApi from './correlationApi';
import priceLevelsApi from './priceLevelsApi';
import correlationReportApi from './correlationReportApi';
import systemApi from './systemApi';

const router = express.Router();

router.use('/asset', assetApi);
router.use('/correlation', correlationApi);
router.use('/priceLevels', priceLevelsApi);
router.use('/correlationReport', correlationReportApi);
router.use('/system', systemApi);

export default router;
