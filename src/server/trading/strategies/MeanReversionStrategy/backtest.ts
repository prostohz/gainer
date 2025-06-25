import * as R from 'remeda';

import { measureTime } from '../../../utils/performance/measureTime';
import BinanceHTTPClient, { TTrade } from '../../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';
import { TTimeEnvironment } from '../types';
import { FakeDataProvider, FakeStreamDataProvider } from '../fakes';
import { MeanReversionStrategy, TPositionDirection, TSignal } from './strategy';
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

const buildTradesCache = measureTime(
  'Построение кеша сделок',
  async (symbols: string[], startTimestamp: number, endTimestamp: number) => {
    const BATCH_SIZE = 1000;

    const binanceHttpClient = BinanceHTTPClient.getInstance();

    const cache = new Map<string, TTrade[]>();

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

        cache.set(symbol, symbolTrades);
      }),
    );

    return cache;
  },
);

const mergeTrades = (assetATrades: TTrade[], assetBTrades: TTrade[]) => {
  const trades: TTrade[] = [];
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

export const run = measureTime(
  'Запуск бэктеста',
  async (pairs: string[], startTimestamp: number, endTimestamp: number) => {
    const BASE_QUANTITY = 1000;

    const tradedPairs = pairs.map((pair) => pair.split('-'));
    const symbols = Array.from(new Set(tradedPairs.flat()));
    const tradesCache = await buildTradesCache(symbols, startTimestamp, endTimestamp);

    const timeEnvironment: TTimeEnvironment = {
      currentTime: startTimestamp,
    };

    const completeTrades: TCompleteTrade[] = [];

    const dataProvider = new FakeDataProvider(timeEnvironment);
    const streamDataProvider = new FakeStreamDataProvider();
    const strategy = new MeanReversionStrategy({
      dataProvider,
      streamDataProvider,
    });

    for (let i = 0; i < tradedPairs.length; i++) {
      const [symbolA, symbolB] = tradedPairs[i];

      timeEnvironment.currentTime = startTimestamp;

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

      await strategy.start(symbolA, symbolB);

      const pairTrades = mergeTrades(assetATrades, assetBTrades);

      for (const trade of pairTrades) {
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

      console.log(`Processed ${(((i + 1) / tradedPairs.length) * 100).toFixed(2)}% pairs`);
    }

    return completeTrades;
  },
);
