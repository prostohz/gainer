import fs from 'fs';
import path from 'path';
import * as R from 'remeda';

import { TPriceLevelsTimeframe, TTimeframe } from '../../../../trading/types';
import { Correlation } from '../../../../trading/indicators/Correlation/Correlation';
import { TKline } from '../../../../trading/types';
import BinanceHTTPClient, {
  TExchangeInfoSymbol,
} from '../../../../trading/providers/Binance/BinanceHTTPClient';
import { getAssets } from '../assetsService';
import { TCorrelation } from './types';

const TIMEFRAMES: TTimeframe[] = ['1m', '15m', '1h', '4h', '1d'];
const CANDLE_LIMIT = 1000;

const binanceHttpClient = BinanceHTTPClient.getInstance();

const klinesCache: Record<string, TKline[]> = {};

const fetchCachedHistoricalKlines = async (
  symbol: string,
  timeframe: TTimeframe,
  limit: number,
): Promise<TKline[]> => {
  const cacheKey = `${symbol}_${timeframe}_${limit}`;

  if (klinesCache[cacheKey]) {
    return klinesCache[cacheKey];
  }

  const klines = await binanceHttpClient.fetchHistoricalKlines(symbol, timeframe, limit);
  klinesCache[cacheKey] = klines;

  return klines;
};

type TGetPairCorrelationOptions = {
  timeframes: TTimeframe[];
  candleLimit: number;
};

export const getPairCorrelation = async (
  symbolA: string,
  symbolB: string,
  options: TGetPairCorrelationOptions = {
    timeframes: TIMEFRAMES,
    candleLimit: CANDLE_LIMIT,
  },
) => {
  const { timeframes, candleLimit } = options;

  const [timeframeKlinesA, timeframeKlinesB] = await Promise.all([
    Promise.all(
      timeframes.map((timeframe) => fetchCachedHistoricalKlines(symbolA, timeframe, candleLimit)),
    ),
    Promise.all(
      timeframes.map((timeframe) => fetchCachedHistoricalKlines(symbolB, timeframe, candleLimit)),
    ),
  ]);

  const timeframeKlinesMapA = R.fromEntries(R.zip(timeframes, timeframeKlinesA)) as Record<
    TPriceLevelsTimeframe,
    TKline[]
  >;

  const timeframeKlinesMapB = R.fromEntries(R.zip(timeframes, timeframeKlinesB)) as Record<
    TPriceLevelsTimeframe,
    TKline[]
  >;

  const correlation = new Correlation();

  const correlationResult = correlation.calculateCorrelation(
    timeframeKlinesMapA,
    timeframeKlinesMapB,
  );

  return correlationResult;
};

const reportPath = path.resolve(__dirname, '../../../../../data/correlationReport.json');

export const getCorrelationReport = async () => {
  if (fs.existsSync(reportPath)) {
    return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  }

  return null;
};

const serializePairName = (tickerA: string, tickerB: string) => `${tickerA}-${tickerB}`;

export const buildCorrelationReport = async () => {
  const assets: TExchangeInfoSymbol[] = await getAssets();
  const assetTickers = assets.map((asset) => asset.symbol).slice(0, 200);

  const report: Record<string, TCorrelation | null> = {};

  for await (const ticker of assetTickers) {
    await fetchCachedHistoricalKlines(ticker, '1d', 100);
  }

  for await (const tickerA of assetTickers) {
    for await (const tickerB of assetTickers) {
      if (tickerA === tickerB) {
        report[serializePairName(tickerA, tickerB)] = null;
        continue;
      }

      if (report[serializePairName(tickerB, tickerA)]) {
        report[serializePairName(tickerA, tickerB)] = report[serializePairName(tickerB, tickerA)];
        continue;
      }

      report[serializePairName(tickerA, tickerB)] = await getPairCorrelation(tickerA, tickerB, {
        timeframes: ['1d'],
        candleLimit: 100,
      });
    }
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
};
