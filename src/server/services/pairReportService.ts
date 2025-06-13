import path from 'path';
import fs from 'fs';
import * as R from 'remeda';

import { TTimeframe, TPairReportEntry, TPairReportMap, TPairReportMeta } from '../../shared/types';
import { PearsonCorrelation } from '../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { BetaHedge } from '../trading/indicators/BetaHedge/BetaHedge';
import { EngleGrangerTest } from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { TIndicatorCandle } from '../trading/indicators/types';
import { HalfLife } from '../trading/indicators/HalfLife/HalfLife';
import { HurstExponent } from '../trading/indicators/HurstExponent/HurstExponent';
import BinanceHTTPClient from '../trading/providers/Binance/BinanceHTTPClient';
import { Asset } from '../models/Asset';

const CANDLE_LIMIT = 1000;
const MIN_VOLUME = 1_000_000;
const MAX_P_VALUE = 0.01;
const MAX_HURST_EXPONENT = 0.5;
const MAX_HALF_LIFE = 4;

const pairReportFolder = path.resolve(process.cwd(), 'data', 'pairReports');
const pairReportMetaDataFilePath = (id: string) => path.join(pairReportFolder, id, 'report.json');
const pairReportDataFilePath = (id: string) => path.join(pairReportFolder, id, 'data.json');

const binanceHttpClient = BinanceHTTPClient.getInstance();

export const getReportList = async () => {
  const entries = fs.readdirSync(pairReportFolder);

  return entries
    .filter((entry) => {
      const stat = fs.statSync(path.join(pairReportFolder, entry));
      return stat.isDirectory();
    })
    .map((entry) => {
      const reportContent = fs.readFileSync(
        path.join(pairReportFolder, entry, 'report.json'),
        'utf-8',
      );

      const reportJSON = JSON.parse(reportContent);

      return {
        id: reportJSON.id,
        timeframe: reportJSON.timeframe,
        date: reportJSON.date,
      };
    });
};

export const getReport = async (id: string) => {
  if (
    !fs.existsSync(pairReportMetaDataFilePath(id)) ||
    !fs.existsSync(pairReportDataFilePath(id))
  ) {
    return null;
  }

  const reportMetaDataContent = fs.readFileSync(pairReportMetaDataFilePath(id), 'utf-8');
  const reportDataContent = fs.readFileSync(pairReportDataFilePath(id), 'utf-8');

  const reportMetaData = JSON.parse(reportMetaDataContent) as TPairReportMeta;
  const reportData = JSON.parse(reportDataContent) as TPairReportMap;

  return {
    ...reportMetaData,
    data: reportData,
  };
};

export const createReport = async (timeframe: TTimeframe, date: number) => {
  const id = `${timeframe}_${date}`;

  const assets = await Asset.findAll();
  const assetsWithVolume = assets.filter((asset) => Number(asset.usdtVolume) > MIN_VOLUME);

  const report: Map<string, TPairReportEntry> = new Map();

  const candlesCache = new Map<string, TIndicatorCandle[]>();

  await Promise.all(
    assetsWithVolume.map(async ({ symbol }) => {
      const candles = await binanceHttpClient.fetchAssetCandles({
        symbol,
        timeframe,
        limit: CANDLE_LIMIT,
        endTime: date,
      });

      const candlesWithMetadata: TIndicatorCandle[] = candles.map((candle) => ({
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
      }));

      candlesCache.set(symbol, candlesWithMetadata);
    }),
  );

  const serializePairName = (tickerA: string, tickerB: string) => `${tickerA}-${tickerB}`;

  const startTime = Date.now();

  for (const assetA of assetsWithVolume) {
    for (const assetB of assetsWithVolume) {
      if (assetA.symbol === assetB.symbol) {
        continue;
      }

      const pairName = serializePairName(assetA.symbol, assetB.symbol);

      if (report.has(pairName)) {
        continue;
      }

      try {
        const candlesA = candlesCache.get(assetA.symbol)!;
        const candlesB = candlesCache.get(assetB.symbol)!;

        if (candlesA.length !== candlesB.length || candlesA.length === 0 || candlesB.length === 0) {
          report.set(pairName, null);

          continue;
        }

        const pearsonCorrelation = new PearsonCorrelation();
        const correlationByPrices = pearsonCorrelation.correlationByPrices(candlesA, candlesB);

        const engleGrangerTest = new EngleGrangerTest();
        const cointegration = engleGrangerTest.calculateCointegration(candlesA, candlesB);

        if (cointegration.pValue > MAX_P_VALUE) {
          report.set(pairName, null);

          continue;
        }

        const pricesA = candlesA.map((candle) => candle.close);
        const pricesB = candlesB.map((candle) => candle.close);

        const hurstExponent = new HurstExponent();
        const hurstExponentValue = hurstExponent.calculate(pricesA, pricesB);

        if (hurstExponentValue > MAX_HURST_EXPONENT) {
          report.set(pairName, null);

          continue;
        }

        const halfLife = new HalfLife();
        const halfLifeValue = halfLife.calculate(pricesA, pricesB);

        if (halfLifeValue > MAX_HALF_LIFE) {
          report.set(pairName, null);

          continue;
        }

        const betaHedge = new BetaHedge();
        const beta = betaHedge.calculateBeta(pricesA, pricesB);

        report.set(pairName, {
          pValue: cointegration.pValue,
          halfLife: halfLifeValue,
          hurstExponent: hurstExponentValue,
          correlationByPrices,
          beta,
        });
      } catch (error) {
        console.error(pairName, error);

        report.set(pairName, null);
      }
    }
  }

  fs.mkdirSync(path.join(pairReportFolder, id), { recursive: true });

  const reportMetaData = {
    id,
    timeframe,
    date,
  };

  const reportData = R.pipe(
    R.entries<TPairReportMap>(Object.fromEntries(report)),
    R.filter((entry): entry is [string, NonNullable<TPairReportEntry>] => entry[1] !== null),
    R.map(([pair, correlation]) => ({
      pair,
      ...correlation,
    })),
    R.sort((a, b) => {
      if (a.halfLife === null && b.halfLife === null) {
        return 0;
      }
      if (a.halfLife === Infinity && b.halfLife === Infinity) {
        return 0;
      }

      return a.halfLife - b.halfLife;
    }),
  );

  fs.writeFileSync(pairReportMetaDataFilePath(id), JSON.stringify(reportMetaData, null, 2));
  fs.writeFileSync(pairReportDataFilePath(id), JSON.stringify(reportData, null, 2));

  console.log(`Report built in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
};

export const deleteReport = async (id: string) => {
  fs.rmSync(path.join(pairReportFolder, id), { recursive: true });
};
