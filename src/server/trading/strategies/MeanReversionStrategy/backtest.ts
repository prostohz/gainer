import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import * as R from 'remeda';
import dayjs from 'dayjs';

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

const backtestTimeStart = dayjs('2025-05-31T00:00:00Z');
const backtestTimeEnd = backtestTimeStart.add(12, 'hour');

const backtestTimeStartTimestamp = backtestTimeStart.valueOf();
const backtestTimeEndTimestamp = backtestTimeEnd.valueOf();

const TIMEFRAME = '1m';
const SYMBOLS = ['ARUSDT', 'LUNCUSDT', 'MTLUSDT', 'REDUSDT', 'BTTCUSDT'];

const loadTrades = measureTime('Загрузка сделок из Binance', async (symbols: string[]) => {
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
              [Op.gte]: backtestTimeStartTimestamp,
              [Op.lte]: backtestTimeStartTimestamp + BORDER_WINDOW_MS,
            },
          },
        }),
        Trade.findOne({
          where: {
            symbol,
            timestamp: {
              [Op.gte]: backtestTimeEndTimestamp - BORDER_WINDOW_MS,
              [Op.lte]: backtestTimeEndTimestamp,
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
          params.startTime = backtestTimeStartTimestamp;
        }
        const batchTrades = await binanceHttpClient.fetchAssetTrades(symbol, BATCH_SIZE, params);
        const batchTradesFiltered = batchTrades.filter(
          (trade) => trade.timestamp <= backtestTimeEndTimestamp,
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
});

const loadCandles = measureTime(
  'Загрузка свечей из Binance',
  async (symbols: string[], timeframe: TTimeframe) => {
    await Candle.sync();

    const binanceHttpClient = BinanceHTTPClient.getInstance();

    await Promise.all(
      symbols.map(async (symbol) => {
        const candles = await binanceHttpClient.fetchAssetCandles(
          symbol,
          timeframe,
          1000,
          undefined,
          backtestTimeStartTimestamp,
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

const buildAssetsCache = measureTime('Построение кеша активов', async () => {
  const cache = new Map<string, Asset>();
  const assets = await Asset.findAll({
    where: { symbol: { [Op.in]: SYMBOLS } },
  });
  assets.forEach((asset) => cache.set(asset.symbol, asset));

  return cache;
});

const buildTradesCache = measureTime('Построение кеша сделок', async () => {
  const cache = new Map<string, Trade[]>();
  const symbolTrades = await Promise.all(
    SYMBOLS.map(async (symbol) => ({
      symbol,
      trades: await Trade.findAll({
        where: {
          symbol,
          timestamp: {
            [Op.gte]: backtestTimeStartTimestamp,
            [Op.lte]: backtestTimeEndTimestamp,
          },
        },
        order: [['timestamp', 'ASC']],
      }),
    })),
  );

  symbolTrades.forEach(({ symbol, trades }) => cache.set(symbol, trades));

  return cache;
});

const saveCompleteTrades = measureTime(
  'Сохранение сделок',
  async (completeTrades: TCompleteTrade[]) => {
    const dataDir = path.resolve(process.cwd(), 'data', 'backtest');
    const fileName = `report_${backtestTimeStart.toISOString()}_${backtestTimeEnd.toISOString()}.json`;
    const filePath = path.join(dataDir, fileName);

    const sortedTrades = R.pipe(
      completeTrades,
      R.map((trade) => ({
        ...trade,
        assetA: trade.assetA.symbol,
        assetB: trade.assetB.symbol,
      })),
      R.sortBy(R.prop('profitPercent')),
    );

    await fs.writeFile(filePath, JSON.stringify(sortedTrades, null, 2), 'utf8');

    return filePath;
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

(async () => {
  const timeEnvironment: TTimeEnvironment = {
    currentTime: backtestTimeStartTimestamp,
  };

  await loadTrades(SYMBOLS);
  await loadCandles(SYMBOLS, TIMEFRAME);

  const assetsCache = await buildAssetsCache();
  const tradesCache = await buildTradesCache();

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

    for (const symbolA of SYMBOLS) {
      const assetA = assetsCache.get(symbolA)!;
      const assetATrades = tradesCache.get(symbolA) ?? [];

      for (const symbolB of SYMBOLS) {
        const assetB = assetsCache.get(symbolB)!;

        if (symbolA === symbolB) continue;
        if (!processedPairs.checkPair(symbolA, symbolB)) continue;

        processedPairs.setPairProcessed(symbolA, symbolB);

        timeEnvironment.currentTime = backtestTimeStartTimestamp;

        const dataProvider = new FakeDataProvider(timeEnvironment);
        const streamDataProvider = new FakeStreamDataProvider();

        const strategy = new MeanReversionStrategy(symbolA, symbolB, TIMEFRAME, {
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

  if (backtestCompleteTrades.length > 0) {
    const tradesCount = backtestCompleteTrades.length;
    const totalProfitPercent = backtestCompleteTrades.reduce(
      (acc, trade) => acc + trade.profitPercent,
      0,
    );
    const averageProfitPercent = totalProfitPercent / tradesCount;
    const averageTradesDurationInMinutes =
      backtestCompleteTrades.reduce(
        (acc, trade) => acc + (trade.closeTime - trade.openTime) / 60000,
        0,
      ) / tradesCount;

    console.log(`
        Отчёт за период ${backtestTimeStart.toISOString()} → ${backtestTimeEnd.toISOString()}:
        Общее количество сделок: ${tradesCount}. 
        Средняя прибыль: ${averageProfitPercent.toFixed(2)}%. 
        Средняя продолжительность: ${averageTradesDurationInMinutes.toFixed(2)} минут.\n`);

    const reportFilePath = await saveCompleteTrades(backtestCompleteTrades);
    console.log(`Сделки сохранены в ${reportFilePath}`);
  } else {
    console.log('Нет сделок ни по одной паре');
  }
})();
