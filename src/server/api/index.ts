import express from 'express';

import assetApi from './assetApi';
import correlationApi from './correlationApi';
import priceLevelsApi from './priceLevelsApi';
import pairReportApi from './pairReportApi';
import backtestApi from './backtestApi';
import systemApi from './systemApi';

const router = express.Router();

router.use('/asset', assetApi);
router.use('/correlation', correlationApi);
router.use('/priceLevels', priceLevelsApi);
router.use('/pairReport', pairReportApi);
router.use('/backtest', backtestApi);
router.use('/system', systemApi);

export default router;
