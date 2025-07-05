import { Op } from 'sequelize';
import * as R from 'remeda';

import { dayjs } from '../../../../shared/utils/daytime';
import { measureTime } from '../../../utils/performance/measureTime';
import { backtestLogger as logger } from '../../../utils/logger';
import { Asset } from '../../../models/Asset';
import { Candle } from '../../../models/Candle';
import { BinanceHTTPClient, TTrade } from '../../providers/Binance/spot/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/spot/BinanceStreamClient';
import { TTimeEnvironment } from '../types';
import { FakeDataProvider, FakeStreamDataProvider } from '../fakes';
import { MeanReversionStrategy, TPositionDirection, TSignal } from './strategy';
import { calculateRoi } from './roi';
import { TradingAvailabilityManager } from './TradingAvailabilityManager';

type TPair = {
  assetA: {
    baseAsset: string;
    quoteAsset: string;
  };
  assetB: {
    baseAsset: string;
    quoteAsset: string;
  };
};

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
  logger.info,
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

const getAssetSymbol = (asset: { baseAsset: string; quoteAsset: string }) =>
  `${asset.baseAsset}${asset.quoteAsset}`;

const getPairSymbol = (
  assetA: { baseAsset: string; quoteAsset: string },
  assetB: { baseAsset: string; quoteAsset: string },
) => `${getAssetSymbol(assetA)}-${getAssetSymbol(assetB)}`;

const loadAssetPrices = measureTime(
  'Загрузка цен активов',
  async (currentTime: number) => {
    const usdtAssets = await Asset.findAll({
      where: {
        [Op.or]: [{ baseAsset: 'USDT' }, { quoteAsset: 'USDT' }],
        status: 'TRADING',
        isSpotTradingAllowed: true,
      },
    });

    const assetCandles = await Promise.all(
      usdtAssets.map(async (asset) => {
        try {
          const latestCandle = await Candle.findOne({
            where: {
              symbol: asset.symbol,
              timeframe: '1m',
              openTime: {
                [Op.lt]: currentTime,
              },
            },
            order: [['openTime', 'DESC']],
          });

          return {
            symbol: asset.symbol,
            latestCandle,
          };
        } catch (error) {
          return {
            symbol: asset.symbol,
            latestCandle: null,
          };
        }
      }),
    );

    const assetPrices = R.pipe(
      assetCandles,
      R.filter((item) => !!item.latestCandle),
      R.map((item) => ({
        symbol: item.symbol,
        price: Number(item.latestCandle?.close ?? 0),
      })),
      R.reduce(
        (acc, item) => ({ ...acc, [item.symbol]: item.price }),
        {} as Record<string, number>,
      ),
    );

    return assetPrices;
  },
  logger.info,
);

export const run = measureTime(
  'Запуск бэктеста',
  async (pairs: TPair[], startTimestamp: number, endTimestamp: number) => {
    const BASE_QUANTITY = 1000;

    const symbols = Array.from(
      new Set(
        pairs.map(({ assetA, assetB }) => [getAssetSymbol(assetA), getAssetSymbol(assetB)]).flat(),
      ),
    );

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

    const tradingAvailabilityManager = new TradingAvailabilityManager(
      () => timeEnvironment.currentTime,
    );

    // Инициализируем диспетчер торговой доступности для всех пар
    pairs.forEach(({ assetA, assetB }) => {
      const pairSymbol = getPairSymbol(assetA, assetB);
      tradingAvailabilityManager.initializePair(pairSymbol);
    });

    let lastHourlyUpdate = startTimestamp;
    let assetPrices = await loadAssetPrices(startTimestamp);
    strategy.setAssetPrices(assetPrices);

    for (let i = 0; i < pairs.length; i++) {
      const { assetA, assetB } = pairs[i];
      const symbolA = getAssetSymbol(assetA);
      const symbolB = getAssetSymbol(assetB);
      const pairSymbol = getPairSymbol(assetA, assetB);

      timeEnvironment.currentTime = startTimestamp;

      const assetATrades = tradesCache.get(symbolA) ?? [];
      const assetBTrades = tradesCache.get(symbolB) ?? [];

      const lastAssetATrade = assetATrades[assetATrades.length - 1];
      const lastAssetBTrade = assetBTrades[assetBTrades.length - 1];

      let openTrade: TOpenTrade | null = null;

      strategy.on('signal', (signal: TSignal) => {
        switch (signal.type) {
          case 'open':
            if (!tradingAvailabilityManager.isPairAvailable(pairSymbol)) {
              strategy.positionEnterRejected();
              return;
            }

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
              {
                direction: openTrade.direction,
                assetA: assetA,
                assetB: assetB,
                quantityA: openTrade.quantityA,
                quantityB: openTrade.quantityB,
                openPriceA: openTrade.openPriceA,
                openPriceB: openTrade.openPriceB,
                closePriceA: signal.symbolA.price,
                closePriceB: signal.symbolB.price,
              },
              assetPrices,
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

            // Записываем результат торговли для анализа и управления рисками
            tradingAvailabilityManager.recordTrade(pairSymbol, roi);

            if (signal.type === 'stopLoss') {
              tradingAvailabilityManager.forceBlockPair(pairSymbol, 'Stop-loss сработал');
            }

            break;
        }
      });

      await strategy.start(assetA, assetB);
      strategy.setAssetPrices(assetPrices);

      const pairTrades = mergeTrades(assetATrades, assetBTrades);

      for (const trade of pairTrades) {
        if (trade.timestamp >= timeEnvironment.currentTime) {
          timeEnvironment.currentTime = trade.timestamp;

          if (dayjs.duration(timeEnvironment.currentTime - lastHourlyUpdate).asHours() > 1) {
            assetPrices = await loadAssetPrices(timeEnvironment.currentTime);
            lastHourlyUpdate = timeEnvironment.currentTime;
            strategy.setAssetPrices(assetPrices);
          }

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

      logger.verbose(`Processed ${(((i + 1) / pairs.length) * 100).toFixed(2)}% pairs`);
    }

    return completeTrades;
  },
  logger.info,
);
