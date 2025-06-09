import { Op } from 'sequelize';

import { TTimeframe } from '../../../../shared/types';
import {
  OPEN_POSITION_COMMISSION_RATE,
  MARGIN_HOUR_COMMISSION_RATE,
} from '../../../configs/trading';
import { Candle } from '../../../models/Candle';
import { Trade } from '../../../models/Trade';
import { measureTime } from '../../../utils/performance';
import BinanceHTTPClient, { TTrade, TCandle } from '../../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';
import { TTimeEnvironment } from '../types';
import { FakeDataProvider, FakeStreamDataProvider } from '../fakes';
import { MeanReversionStrategy, TPositionDirection, TSignal } from './strategy';
import { timeframeToMilliseconds } from '../../../utils/timeframe';

type TOpenTrade = {
  symbolA: string;
  symbolB: string;
  direction: TPositionDirection;
  openPriceA: number;
  openPriceB: number;
  openTime: number;
  reason: string;
};

type TCompleteTrade = {
  id: number;
  direction: TPositionDirection;
  symbolA: string;
  symbolB: string;
  openPriceA: number;
  closePriceA: number;
  openPriceB: number;
  closePriceB: number;
  openTime: number;
  closeTime: number;
  profitPercent: number;
  openReason: string;
  closeReason: string;
};

const loadTrades = measureTime(
  'Загрузка сделок из Binance',
  async (symbols: string[], startTimestamp: number, endTimestamp: number) => {
    await Trade.sync();

    const BATCH_SIZE = 1000;

    const binanceHttpClient = BinanceHTTPClient.getInstance();

    await Promise.all(
      symbols.map(async (symbol) => {
        let symbolTrades: TTrade[] = [];

        let lastTradeId: number | undefined;

        while (true) {
          const params: { startTime?: number; fromId?: number } = {};
          if (lastTradeId) {
            params.fromId = lastTradeId;
          } else {
            params.startTime = startTimestamp;
          }
          const batchTrades = await binanceHttpClient.fetchAssetTrades(symbol, BATCH_SIZE, params);
          const batchTradesFiltered = batchTrades.filter(
            (trade) => trade.timestamp <= endTimestamp,
          );

          symbolTrades = [...symbolTrades, ...batchTradesFiltered];

          if (batchTradesFiltered.length < BATCH_SIZE) {
            break;
          }

          lastTradeId = batchTradesFiltered[batchTradesFiltered.length - 1].tradeId;
        }

        return Trade.bulkCreate(symbolTrades, { ignoreDuplicates: true });
      }),
    );
  },
);

const loadCandles = measureTime(
  'Загрузка свечей из Binance',
  async (
    symbols: string[],
    timeframe: TTimeframe,
    startTimestamp: number,
    endTimestamp: number,
  ) => {
    await Candle.sync();

    const BATCH_SIZE = 1000;

    const binanceHttpClient = BinanceHTTPClient.getInstance();

    await Promise.all(
      symbols.map(async (symbol) => {
        const allCandles: TCandle[] = [];

        let fetchFrom = startTimestamp;

        while (true) {
          const fetchTo = fetchFrom + BATCH_SIZE * timeframeToMilliseconds(timeframe);

          const candles = await binanceHttpClient.fetchAssetCandles({
            symbol,
            timeframe,
            startTime: fetchFrom,
            endTime: fetchTo,
          });

          if (!candles.length) {
            break;
          }

          allCandles.push(...candles);
          fetchFrom = fetchTo + 1;

          if (fetchTo >= endTimestamp) {
            break;
          }
        }

        const candlesWithMetadata: (TCandle & { symbol: string; timeframe: string })[] =
          allCandles.map((candle) => ({
            ...candle,
            symbol,
            timeframe,
          }));

        return Candle.bulkCreate(candlesWithMetadata, { ignoreDuplicates: true });
      }),
    );
  },
);

const buildTradesCache = measureTime(
  'Построение кеша сделок',
  async (symbols: string[], startTimestamp: number, endTimestamp: number) => {
    const cache = new Map<string, Trade[]>();
    const symbolTrades = await Promise.all(
      symbols.map(async (symbol) => ({
        symbol,
        trades: await Trade.findAll({
          where: {
            symbol,
            timestamp: {
              [Op.gte]: startTimestamp,
              [Op.lte]: endTimestamp,
            },
          },
          order: [['timestamp', 'ASC']],
        }),
      })),
    );

    symbolTrades.forEach(({ symbol, trades }) => cache.set(symbol, trades));

    return cache;
  },
);

const mergeTrades = (assetATrades: Trade[], assetBTrades: Trade[]) => {
  const trades: Trade[] = [];
  let i = 0;
  let j = 0;
  while (i < assetATrades.length && j < assetBTrades.length) {
    if (assetATrades[i].timestamp <= assetBTrades[j].timestamp) {
      trades.push(assetATrades[i]);
      i++;
    } else {
      trades.push(assetBTrades[j]);
      j++;
    }
  }
  while (i < assetATrades.length) {
    trades.push(assetATrades[i]);
    i++;
  }
  while (j < assetBTrades.length) {
    trades.push(assetBTrades[j]);
    j++;
  }

  return trades;
};

const calculateProfitPercent = (
  direction: TPositionDirection,
  openPriceA: number,
  openPriceB: number,
  closePriceA: number,
  closePriceB: number,
  durationMs: number,
) => {
  let pnlA = 0;
  let pnlB = 0;

  if (direction === 'buy-sell') {
    pnlA = (closePriceA - openPriceA) / openPriceA;
    pnlB = (openPriceB - closePriceB) / openPriceB;
  } else {
    pnlA = (openPriceA - closePriceA) / openPriceA;
    pnlB = (closePriceB - openPriceB) / openPriceB;
  }

  const grossProfitPercent = pnlA + pnlB;
  const openingCommission = 4 * OPEN_POSITION_COMMISSION_RATE;
  const holdingCommission =
    (Math.ceil(durationMs / (60 * 60 * 1000)) * MARGIN_HOUR_COMMISSION_RATE) / 2;

  return (grossProfitPercent - openingCommission - holdingCommission) * 100;
};

export const run = async (
  symbolA: string,
  symbolB: string,
  timeframe: TTimeframe,
  startTimestamp: number,
  endTimestamp: number,
) => {
  const symbols = [symbolA, symbolB];

  const timeEnvironment: TTimeEnvironment = {
    currentTime: startTimestamp,
  };

  await loadTrades(symbols, startTimestamp, endTimestamp);
  await loadCandles(symbols, timeframe, startTimestamp, endTimestamp);

  const tradesCache = await buildTradesCache(symbols, startTimestamp, endTimestamp);

  const processedPairs = {
    pairsMap: new Map<string, number>(),
    normalizePair(symbolA: string, symbolB: string): string {
      return [symbolA, symbolB].sort().join('-');
    },
    checkPair(symbolA: string, symbolB: string): boolean {
      const pair = this.normalizePair(symbolA, symbolB);

      if (this.pairsMap.has(pair)) {
        return false;
      }

      this.pairsMap.set(pair, 0);
      return true;
    },
    setPairProcessed(symbolA: string, symbolB: string): void {
      const pair = this.normalizePair(symbolA, symbolB);
      this.pairsMap.set(pair, 1);
    },
  };

  const backtestCompleteTrades = await measureTime('Расчёт сделок', async () => {
    const completeTrades: TCompleteTrade[] = [];

    for (const symbolA of symbols) {
      const assetATrades = tradesCache.get(symbolA) ?? [];

      for (const symbolB of symbols) {
        if (symbolA === symbolB) continue;
        if (!processedPairs.checkPair(symbolA, symbolB)) continue;

        processedPairs.setPairProcessed(symbolA, symbolB);

        timeEnvironment.currentTime = startTimestamp;

        const dataProvider = new FakeDataProvider(timeEnvironment);
        const streamDataProvider = new FakeStreamDataProvider();
        const strategy = new MeanReversionStrategy(symbolA, symbolB, timeframe, {
          dataProvider,
          streamDataProvider,
        });

        const assetBTrades = tradesCache.get(symbolB) ?? [];

        const lastAssetATrade = assetATrades[assetATrades.length - 1];
        const lastAssetBTrade = assetBTrades[assetBTrades.length - 1];

        let openTrade: TOpenTrade | null = null;

        strategy.on('signal', (signal: TSignal) => {
          switch (signal.type) {
            case 'open':
              if (
                timeEnvironment.currentTime >= lastAssetATrade.timestamp ||
                timeEnvironment.currentTime >= lastAssetBTrade.timestamp
              ) {
                strategy.positionEnterRejected();
                return;
              }

              openTrade = {
                symbolA,
                symbolB,
                direction: signal.direction,
                openTime: timeEnvironment.currentTime,
                openPriceA: signal.symbolA.price,
                openPriceB: signal.symbolB.price,
                reason: signal.reason,
              };
              strategy.positionEnterAccepted(signal);
              break;
            case 'close':
            case 'stopLoss':
              if (!openTrade) {
                strategy.positionExitRejected();
                return;
              }

              if (timeEnvironment.currentTime - openTrade.openTime < 5 * 1000) {
                strategy.positionExitRejected();
                return;
              }

              const profitPercent = calculateProfitPercent(
                openTrade.direction,
                openTrade.openPriceA,
                openTrade.openPriceB,
                signal.symbolA.price,
                signal.symbolB.price,
                timeEnvironment.currentTime - openTrade.openTime,
              );

              completeTrades.push({
                id: completeTrades.length + 1,
                symbolA: openTrade.symbolA,
                symbolB: openTrade.symbolB,
                direction: openTrade.direction,
                openTime: openTrade.openTime,
                closeTime: timeEnvironment.currentTime,
                openPriceA: openTrade.openPriceA,
                closePriceA: signal.symbolA.price,
                openPriceB: openTrade.openPriceB,
                closePriceB: signal.symbolB.price,
                openReason: openTrade.reason,
                closeReason: signal.reason,
                profitPercent,
              });
              openTrade = null;
              strategy.positionExitAccepted();
              break;
          }
        });

        await strategy.start();

        const allTrades = mergeTrades(assetATrades, assetBTrades);

        for (const trade of allTrades) {
          if (trade.timestamp >= timeEnvironment.currentTime) {
            timeEnvironment.currentTime = trade.timestamp;

            const binanceTrade: TBinanceTrade = {
              e: 'trade',
              E: trade.timestamp,
              s: trade.symbol,
              t: trade.tradeId,
              p: trade.price.toString(),
              q: trade.quantity.toString(),
              b: trade.firstTradeId,
              a: trade.lastTradeId,
              T: trade.timestamp,
              m: trade.isBuyerMaker,
              M: false,
            };

            streamDataProvider.emit('trade', binanceTrade);
          }
        }

        if (openTrade) {
          const currentOpenTrade = openTrade as TOpenTrade;

          const lastPriceA = lastAssetATrade
            ? parseFloat(lastAssetATrade.price)
            : currentOpenTrade.openPriceA;
          const lastPriceB = lastAssetBTrade
            ? parseFloat(lastAssetBTrade.price)
            : currentOpenTrade.openPriceB;
          const closeTime = Math.max(
            lastAssetATrade ? lastAssetATrade.timestamp : currentOpenTrade.openTime,
            lastAssetBTrade ? lastAssetBTrade.timestamp : currentOpenTrade.openTime,
            timeEnvironment.currentTime,
          );

          const profitPercent = calculateProfitPercent(
            currentOpenTrade.direction,
            currentOpenTrade.openPriceA,
            currentOpenTrade.openPriceB,
            lastPriceA,
            lastPriceB,
            closeTime - currentOpenTrade.openTime,
          );

          completeTrades.push({
            id: completeTrades.length + 1,
            symbolA: currentOpenTrade.symbolA,
            symbolB: currentOpenTrade.symbolB,
            direction: currentOpenTrade.direction,
            openTime: currentOpenTrade.openTime,
            closeTime,
            openPriceA: currentOpenTrade.openPriceA,
            closePriceA: lastPriceA,
            openPriceB: currentOpenTrade.openPriceB,
            closePriceB: lastPriceB,
            openReason: currentOpenTrade.reason,
            closeReason: 'force-close-at-end',
            profitPercent,
          });
          openTrade = null;
        }

        strategy.stop();
      }
    }

    return completeTrades;
  })();

  return backtestCompleteTrades;
};
