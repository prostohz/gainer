import { Op } from 'sequelize';

import { TTimeframe } from '../../shared/types';
import { PearsonCorrelation } from '../trading/indicators/PearsonCorrelation/PearsonCorrelation';
import { TIndicatorCandle } from '../trading/indicators/types';
import { ZScore } from '../trading/indicators/ZScore/ZScore';
import {
  TCointegrationResult,
  EngleGrangerTest,
} from '../trading/indicators/EngleGrangerTest/EngleGrangerTest';
import { BetaHedge } from '../trading/indicators/BetaHedge/BetaHedge';
import { Candle } from '../models/Candle';

const CANDLE_LIMIT = 1000;
const CANDLE_LIMIT_FOR_PEARSON = 500;
const CANDLE_LIMIT_FOR_Z_SCORE = 20;
const CANDLE_LIMIT_FOR_COINTEGRATION = 1000;
const CANDLE_LIMIT_FOR_ROLLING = 300;
const CANDLE_LIMIT_FOR_BETA = 1000;

const findCandles = async (
  symbol: string,
  timeframe: TTimeframe,
  limit: number,
  date: number,
): Promise<TIndicatorCandle[]> => {
  const candles = await Candle.findAll({
    where: {
      symbol,
      timeframe,
      openTime: {
        [Op.lte]: date,
      },
    },
    limit,
    order: [['openTime', 'DESC']],
  });

  candles.reverse();

  return candles.map((candle) => ({
    openTime: candle.openTime,
    closeTime: candle.closeTime,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
  }));
};

export const getPairCorrelation = async (symbolA: string, symbolB: string, date: number) => {
  const timeframes: TTimeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  const correlationByPrices = {} as Record<TTimeframe, number | null>;
  const correlationByReturns = {} as Record<TTimeframe, number | null>;
  const rollingCorrelationByPrices = {} as Record<
    TTimeframe,
    { timestamp: number; value: number | null }[]
  >;
  const rollingCorrelationByReturns = {} as Record<
    TTimeframe,
    { timestamp: number; value: number | null }[]
  >;
  const zScoreByPrices = {} as Record<TTimeframe, number | null>;
  const zScoreByReturns = {} as Record<TTimeframe, number | null>;
  const rollingZScoreByPrices = {} as Record<
    TTimeframe,
    { timestamp: number; value: number | null }[]
  >;
  const rollingZScoreByReturns = {} as Record<
    TTimeframe,
    { timestamp: number; value: number | null }[]
  >;
  const cointegration = {} as Record<TTimeframe, TCointegrationResult | null>;
  const betaHedge = {} as Record<TTimeframe, number | null>;

  const pearsonCorrelation = new PearsonCorrelation();
  const zScore = new ZScore();
  const engleGrangerTest = new EngleGrangerTest();

  for (const timeframe of timeframes) {
    const [candlesA, candlesB] = await Promise.all([
      findCandles(symbolA, timeframe, CANDLE_LIMIT, date),
      findCandles(symbolB, timeframe, CANDLE_LIMIT, date),
    ]);

    const betaHedgeIndicator = new BetaHedge();
    const beta = betaHedgeIndicator.calculateBeta(
      candlesA.slice(0, CANDLE_LIMIT_FOR_BETA),
      candlesB.slice(0, CANDLE_LIMIT_FOR_BETA),
    );

    if (!beta) {
      console.warn('BetaHedge: beta is null');

      continue;
    }

    correlationByPrices[timeframe] = pearsonCorrelation.correlationByPrices(
      candlesA.slice(0, CANDLE_LIMIT_FOR_PEARSON),
      candlesB.slice(0, CANDLE_LIMIT_FOR_PEARSON),
    );
    correlationByReturns[timeframe] = pearsonCorrelation.correlationByReturns(
      candlesA.slice(0, CANDLE_LIMIT_FOR_PEARSON),
      candlesB.slice(0, CANDLE_LIMIT_FOR_PEARSON),
    );

    zScoreByPrices[timeframe] = zScore.zScoreByPrices(
      candlesA.slice(0, CANDLE_LIMIT_FOR_Z_SCORE),
      candlesB.slice(0, CANDLE_LIMIT_FOR_Z_SCORE),
      beta,
    );
    zScoreByReturns[timeframe] = zScore.zScoreByReturns(
      candlesA.slice(0, CANDLE_LIMIT_FOR_Z_SCORE),
      candlesB.slice(0, CANDLE_LIMIT_FOR_Z_SCORE),
      beta,
    );
    cointegration[timeframe] = engleGrangerTest.calculateCointegration(
      candlesA.slice(0, CANDLE_LIMIT_FOR_COINTEGRATION),
      candlesB.slice(0, CANDLE_LIMIT_FOR_COINTEGRATION),
    );
    betaHedge[timeframe] = beta;
    rollingCorrelationByPrices[timeframe] = pearsonCorrelation.rollingCorrelationByPrices(
      candlesA,
      candlesB,
      CANDLE_LIMIT_FOR_ROLLING,
    );
    rollingCorrelationByReturns[timeframe] = pearsonCorrelation.rollingCorrelationByReturns(
      candlesA,
      candlesB,
      CANDLE_LIMIT_FOR_ROLLING,
    );
    rollingZScoreByPrices[timeframe] = zScore.rollingZScoreByPrices(candlesA, candlesB);
    rollingZScoreByReturns[timeframe] = zScore.rollingZScoreByReturns(candlesA, candlesB);
  }

  return {
    correlationByPrices,
    correlationByReturns,
    zScoreByPrices,
    zScoreByReturns,
    rollingCorrelationByPrices,
    rollingCorrelationByReturns,
    rollingZScoreByPrices,
    rollingZScoreByReturns,
    cointegration,
    betaHedge,
  };
};
