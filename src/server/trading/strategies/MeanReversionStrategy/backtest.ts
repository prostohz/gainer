import { Op } from 'sequelize';

import { TTimeframe } from '../../../../shared/types';
import {
  OPEN_POSITION_COMMISSION_RATE,
  MARGIN_HOUR_COMMISSION_RATE,
} from '../../../configs/trading';
import { Asset } from '../../../models/Asset';
import { Candle } from '../../../models/Candle';
import { Trade } from '../../../models/Trade';
import { measureTime } from '../../../utils/performance';
import BinanceHTTPClient, { TTrade, TCandle } from '../../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';
import { TTimeEnvironment } from '../types';
import { FakeDataProvider, FakeStreamDataProvider } from '../fakes';
import { MeanReversionStrategy, TPositionDirection, TSignal } from './strategy';

type TOpenTrade = {
  direction: TPositionDirection;
  openPriceA: number;
  openPriceB: number;
  openTime: number;
};

type TCompleteTrade = {
  direction: TPositionDirection;
  assetA: Asset;
  assetB: Asset;
  openPriceA: number;
  closePriceA: number;
  openPriceB: number;
  closePriceB: number;
  openTime: number;
  closeTime: number;
  profitPercent: number;
  reason: string;
};

const loadTrades = measureTime(
  'Загрузка сделок из Binance',
  async (symbols: string[], startTimestamp: number, endTimestamp: number) => {
    await Trade.sync();

    const BATCH_SIZE = 1000;

    const binanceHttpClient = BinanceHTTPClient.getInstance();

    await Promise.all(
      symbols.map(async (symbol) => {
        let lastTradeId: number | undefined;
        let symbolTrades: TTrade[] = [];

        const BORDER_WINDOW_MS = 60 * 1000; // 1 минута

        const [startBorderTrade, endBorderTrade] = await Promise.all([
          Trade.findOne({
            where: {
              symbol,
              timestamp: {
                [Op.gte]: startTimestamp,
                [Op.lte]: startTimestamp + BORDER_WINDOW_MS,
              },
            },
          }),
          Trade.findOne({
            where: {
              symbol,
              timestamp: {
                [Op.gte]: endTimestamp - BORDER_WINDOW_MS,
                [Op.lte]: endTimestamp,
              },
            },
          }),
        ]);

        if (startBorderTrade && endBorderTrade) {
          return;
        }

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
  async (symbols: string[], timeframe: TTimeframe, startTimestamp: number) => {
    await Candle.sync();

    const binanceHttpClient = BinanceHTTPClient.getInstance();

    await Promise.all(
      symbols.map(async (symbol) => {
        const candles = await binanceHttpClient.fetchAssetCandles(
          symbol,
          timeframe,
          1000,
          undefined,
          startTimestamp,
        );

        const candlesWithMetadata: (TCandle & { symbol: string; timeframe: string })[] =
          candles.map((candle) => ({
            ...candle,
            symbol,
            timeframe,
          }));

        return Candle.bulkCreate(candlesWithMetadata, { ignoreDuplicates: true });
      }),
    );
  },
);

const buildAssetsCache = measureTime('Построение кеша активов', async (symbols: string[]) => {
  const cache = new Map<string, Asset>();
  const assets = await Asset.findAll({
    where: { symbol: { [Op.in]: symbols } },
  });
  assets.forEach((asset) => cache.set(asset.symbol, asset));

  return cache;
});

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
  await loadCandles(symbols, timeframe, startTimestamp);

  const assetsCache = await buildAssetsCache(symbols);
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
      const assetA = assetsCache.get(symbolA)!;
      const assetATrades = tradesCache.get(symbolA) ?? [];

      for (const symbolB of symbols) {
        const assetB = assetsCache.get(symbolB)!;

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

        let openTrade: TOpenTrade | null = null;

        strategy.on('signal', (signal: TSignal) => {
          switch (signal.type) {
            case 'open':
              openTrade = {
                direction: signal.direction,
                openTime: timeEnvironment.currentTime,
                openPriceA: signal.symbolA.price,
                openPriceB: signal.symbolB.price,
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

              let profit = 0;
              if (openTrade.direction === 'buy-sell') {
                profit =
                  signal.symbolA.price -
                  openTrade.openPriceA +
                  (openTrade.openPriceB - signal.symbolB.price);
              } else {
                profit =
                  openTrade.openPriceA -
                  signal.symbolA.price +
                  (signal.symbolB.price - openTrade.openPriceB);
              }

              const tradesCount = 4;
              const positionDurationInHours = Math.ceil(
                (timeEnvironment.currentTime - openTrade.openTime) / 3600,
              );

              const base = Math.abs(openTrade.openPriceA) + Math.abs(openTrade.openPriceB);
              const profitPercent =
                (profit / base -
                  tradesCount * OPEN_POSITION_COMMISSION_RATE -
                  positionDurationInHours * MARGIN_HOUR_COMMISSION_RATE) *
                100;

              completeTrades.push({
                assetA,
                assetB,
                direction: openTrade.direction,
                openTime: openTrade.openTime,
                closeTime: timeEnvironment.currentTime,
                openPriceA: openTrade.openPriceA,
                closePriceA: signal.symbolA.price,
                openPriceB: openTrade.openPriceB,
                closePriceB: signal.symbolB.price,
                profitPercent,
                reason: signal.reason,
              });
              openTrade = null;
              strategy.positionExitAccepted();
              break;
          }
        });

        const assetBTrades = tradesCache.get(symbolB) ?? [];

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

        // Не открывать сделку на последнем трейде
        // Закрыть сделку если она открыта

        strategy.stop();
      }

      console.log(`Обработан актив ${symbolA}`);
    }

    return completeTrades;
  })();

  return backtestCompleteTrades;
};
