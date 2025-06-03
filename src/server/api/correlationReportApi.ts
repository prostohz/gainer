import express, { Request, Response } from 'express';

import { TTimeframe } from '../../shared/types';
import {
  hasReport,
  getReportList,
  getReportMap,
  buildReport,
  getReportClusters,
} from '../services/correlationReportService';
import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';

const router = express.Router();

router.get(
  '/has',
  validateParams(['timeframe']),
  asyncHandler(async (req: Request, res: Response) => {
    const timeframe = req.query.timeframe as TTimeframe;

    const reportExists = await hasReport(timeframe);
    sendResponse(res, reportExists);
  }),
);

router.get(
  '/list',
  validateParams([
    'timeframe',
    'usdtOnly',
    'ignoreUsdtUsdc',
    'maxPValue',
    'maxHalfLife',
    'minVolume',
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const timeframe = req.query.timeframe as TTimeframe;
    const usdtOnly = req.query.usdtOnly === 'true';
    const ignoreUsdtUsdc = req.query.ignoreUsdtUsdc === 'true';
    const maxPValue = Number(req.query.maxPValue);
    const maxHalfLife = Number(req.query.maxHalfLife);
    const minVolume = Number(req.query.minVolume);

    const report = await getReportList(timeframe, {
      usdtOnly,
      ignoreUsdtUsdc,
      maxPValue,
      maxHalfLife,
      minVolume,
    });

    sendResponse(res, report);
  }),
);

router.get(
  '/map',
  validateParams([
    'timeframe',
    'usdtOnly',
    'ignoreUsdtUsdc',
    'maxPValue',
    'maxHalfLife',
    'minVolume',
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const timeframe = req.query.timeframe as TTimeframe;
    const usdtOnly = req.query.usdtOnly === 'true';
    const ignoreUsdtUsdc = req.query.ignoreUsdtUsdc === 'true';
    const maxPValue = Number(req.query.maxPValue);
    const maxHalfLife = Number(req.query.maxHalfLife);
    const minVolume = Number(req.query.minVolume);

    const report = await getReportMap(timeframe, {
      usdtOnly,
      ignoreUsdtUsdc,
      maxPValue,
      maxHalfLife,
      minVolume,
    });

    sendResponse(res, report);
  }),
);

router.post(
  '/build',
  validateParams(['timeframe']),
  asyncHandler(async (req: Request, res: Response) => {
    const timeframe = req.query.timeframe as TTimeframe;

    await buildReport(timeframe);
    sendResponse(res, { message: 'Report built' });
  }),
);

router.get(
  '/clusters',
  validateParams([
    'timeframe',
    'usdtOnly',
    'ignoreUsdtUsdc',
    'maxPValue',
    'maxHalfLife',
    'minVolume',
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const timeframe = req.query.timeframe as TTimeframe;
    const usdtOnly = req.query.usdtOnly === 'true';
    const ignoreUsdtUsdc = req.query.ignoreUsdtUsdc === 'true';
    const maxPValue = Number(req.query.maxPValue);
    const maxHalfLife = Number(req.query.maxHalfLife);
    const minVolume = Number(req.query.minVolume);

    const correlationReportClusters = await getReportClusters(timeframe, {
      usdtOnly,
      ignoreUsdtUsdc,
      maxPValue,
      maxHalfLife,
      minVolume,
    });

    sendResponse(res, correlationReportClusters);
  }),
);

export default router;
