import { Op } from 'sequelize';
import * as R from 'remeda';

import { TTimeframe } from '../../../../shared/types';
import { Candle } from '../../../models/Candle';
import { Trade } from '../../../models/Trade';
import { measureTime } from '../../../utils/performance';
import BinanceHTTPClient, { TTrade, TCandle } from '../../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';
import { TTimeEnvironment } from '../types';
import { FakeDataProvider, FakeStreamDataProvider } from '../fakes';
import { MeanReversionStrategy, TPositionDirection, TSignal } from './strategy';
import { timeframeToMilliseconds } from '../../../utils/timeframe';
import { calculateRoi } from './roi';

type TOpenTrade = {
  direction: TPositionDirection;
  symbolA: string;
  symbolB: string;
  quantityA: number;
  quantityB: number;
  openPriceA: number;
  openPriceB: number;
  openTime: number;
  reason: string;
};

export type TCompleteTrade = {
  id: number;
  direction: TPositionDirection;
  symbolA: string;
  symbolB: string;
  quantityA: number;
  quantityB: number;
  openPriceA: number;
  closePriceA: number;
  openPriceB: number;
  closePriceB: number;
  openTime: number;
  closeTime: number;
  roi: number;
  openReason: string;
  closeReason: string;
};

const loadTrades = measureTime(
  'Загрузка сделок из Binance',
  async (symbols: string[], startTimestamp: number, endTimestamp: number) => {
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

export const run = async (pairs: string[], startTimestamp: number, endTimestamp: number) => {
  const TIMEFRAME = '1m';
  const BASE_QUANTITY = 1000;

  const tradedPairs = pairs.map((pair) => pair.split('-'));
  const symbols = Array.from(new Set(tradedPairs.flat()));

  const timeEnvironment: TTimeEnvironment = {
    currentTime: startTimestamp,
  };

  await loadTrades(symbols, startTimestamp, endTimestamp);
  await loadCandles(symbols, TIMEFRAME, startTimestamp, endTimestamp);

  const tradesCache = await buildTradesCache(symbols, startTimestamp, endTimestamp);

  const processedPairs = {
    pairsMap: new Map<string, number>(),
    normalizePair(symbolA: string, symbolB: string): string {
      return [symbolA, symbolB].sort().join('-');
    },
    isPairProcessed(symbolA: string, symbolB: string): boolean {
      const pair = this.normalizePair(symbolA, symbolB);

      if (this.pairsMap.has(pair)) {
        return true;
      }
      return false;
    },
    setPairProcessed(symbolA: string, symbolB: string): void {
      const pair = this.normalizePair(symbolA, symbolB);
      this.pairsMap.set(pair, 1);
    },
  };

  const backtestCompleteTrades = await measureTime('Расчёт сделок', async () => {
    const completeTrades: TCompleteTrade[] = [];

    let processedPairsCount = 0;

    for (const [symbolA, symbolB] of tradedPairs) {
      if (symbolA === symbolB) continue;
      if (processedPairs.isPairProcessed(symbolA, symbolB)) {
        continue;
      } else {
        processedPairs.setPairProcessed(symbolA, symbolB);
      }

      timeEnvironment.currentTime = startTimestamp;

      const dataProvider = new FakeDataProvider(timeEnvironment);
      const streamDataProvider = new FakeStreamDataProvider();
      const strategy = new MeanReversionStrategy(symbolA, symbolB, TIMEFRAME, {
        dataProvider,
        streamDataProvider,
      });

      const assetATrades = tradesCache.get(symbolA) ?? [];
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
              direction: signal.direction,
              symbolA,
              symbolB,
              quantityA: BASE_QUANTITY,
              quantityB: BASE_QUANTITY / Math.abs(signal.beta),
              openTime: timeEnvironment.currentTime,
              openPriceA: signal.symbolA.price,
              openPriceB: signal.symbolB.price,
              reason: signal.reason,
            };
            strategy.positionEnterAccepted(
              R.pick(openTrade, [
                'direction',
                'symbolA',
                'symbolB',
                'quantityA',
                'quantityB',
                'openTime',
                'openPriceA',
                'openPriceB',
              ]),
            );

            break;
          case 'close':
          case 'stopLoss':
            if (!openTrade) {
              strategy.positionExitRejected();
              return;
            }

            const roi = calculateRoi(
              openTrade.direction,
              symbolA,
              symbolB,
              openTrade.quantityA,
              openTrade.quantityB,
              openTrade.openPriceA,
              openTrade.openPriceB,
              signal.symbolA.price,
              signal.symbolB.price,
            );

            completeTrades.push({
              id: completeTrades.length + 1,
              direction: openTrade.direction,
              symbolA: openTrade.symbolA,
              symbolB: openTrade.symbolB,
              quantityA: openTrade.quantityA,
              quantityB: openTrade.quantityB,
              openTime: openTrade.openTime,
              closeTime: timeEnvironment.currentTime,
              openPriceA: openTrade.openPriceA,
              closePriceA: signal.symbolA.price,
              openPriceB: openTrade.openPriceB,
              closePriceB: signal.symbolB.price,
              openReason: openTrade.reason,
              closeReason: signal.reason,
              roi,
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

      strategy.stop();

      processedPairsCount++;
      console.log(
        `Processed ${((processedPairsCount / tradedPairs.length) * 100).toFixed(2)}% pairs`,
      );
    }

    return completeTrades;
  })();

  return backtestCompleteTrades;
};
