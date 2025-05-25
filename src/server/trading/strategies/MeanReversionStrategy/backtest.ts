import fs from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import * as R from 'remeda';

import {
  OPEN_POSITION_COMMISSION_RATE,
  MARGIN_HOUR_COMMISSION_RATE,
} from '../../../configs/trading';
import { Asset } from '../../../models/Asset';
import { Trade } from '../../../models/Trade';
import BinanceHTTPClient, { TTrade } from '../../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';
import { TTimeEnvironment } from '../types';
import { FakeDataProvider, FakeDateTimeProvider, FakeStreamDataProvider } from '../fakes';
import { MeanReversionStrategy, TSignal } from './strategy';

const backtestTimeStart = new Date('2025-05-26T00:00:00Z').getTime();
const backtestTimeEnd = new Date('2025-05-26T04:00:00Z').getTime();

export const loadTrades = async (symbols: string[]) => {
  const BATCH_SIZE = 1000;

  const binanceHttpClient = BinanceHTTPClient.getInstance();

  await Trade.sync();

  await Promise.all(
    symbols.map(async (symbol) => {
      let lastTradeId: number | undefined;
      let symbolTrades: TTrade[] = [];

      // Проверяем, есть ли уже сделки для этого символа в базе за нужный период (окрестности обеих границ)
      // Считаем, что сделки есть, если есть хотя бы одна сделка в пределах 1 минуты от начала и конца периода
      const BORDER_WINDOW_MS = 60 * 1000; // 1 минута

      const [startBorderTrade, endBorderTrade] = await Promise.all([
        Trade.findOne({
          where: {
            symbol,
            timestamp: {
              [Op.gte]: backtestTimeStart,
              [Op.lte]: backtestTimeStart + BORDER_WINDOW_MS,
            },
          },
        }),
        Trade.findOne({
          where: {
            symbol,
            timestamp: {
              [Op.gte]: backtestTimeEnd - BORDER_WINDOW_MS,
              [Op.lte]: backtestTimeEnd,
            },
          },
        }),
      ]);

      if (startBorderTrade && endBorderTrade) {
        console.log(`Сделки для ${symbol} есть в базе`);
        return;
      }

      while (true) {
        const params: { startTime?: number; fromId?: number } = {};
        if (lastTradeId) {
          params.fromId = lastTradeId;
        } else {
          params.startTime = backtestTimeStart;
        }
        const batchTrades = await binanceHttpClient.fetchAssetTrades(symbol, BATCH_SIZE, params);
        const batchTradesFiltered = batchTrades.filter(
          (trade) => trade.timestamp <= backtestTimeEnd,
        );

        symbolTrades = [...symbolTrades, ...batchTradesFiltered];

        if (batchTradesFiltered.length < BATCH_SIZE) {
          break;
        }

        lastTradeId = batchTradesFiltered[batchTradesFiltered.length - 1].tradeId;
      }

      console.log(`Загружено сделок для ${symbol}: ${symbolTrades.length}`);

      return Trade.bulkCreate(symbolTrades, { ignoreDuplicates: true });
    }),
  );
};

(async () => {
  const timeEnvironment: TTimeEnvironment = {
    currentTime: backtestTimeStart,
  };

  const SYMBOLS = [
    'WOOUSDT',
    'ACHUSDT',
    '1INCHUSDT',
    'STRKUSDT',
    'UNIUSDT',
    'INJUSDT',
    'GALAUSDT',
    'XAIUSDT',
    'RAREUSDT',
    'PORTALUSDT',
    'GRTUSDT',
    'VELODROMEUSDT',
    'ETCUSDT',
    'AXSUSDT',
    'APTUSDT',
    'ZROUSDT',
    'ARBUSDT',
    'AEVOUSDT',
    'DOGEUSDT',
    'BONKUSDT',
    'ALPHAUSDT',
    'ACTUSDT',
    'SEIUSDT',
    'CKBUSDT',
    'ALGOUSDT',
    'MKRUSDT',
    'JUPUSDT',
  ];

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

  await loadTrades(SYMBOLS);

  const tradesReport: Array<{
    position: 'long-short' | 'short-long';
    assetA: Asset;
    assetB: Asset;
    openPriceA: number;
    closePriceA: number;
    openPriceB: number;
    closePriceB: number;
    openTime: number;
    closeTime: number;
  }> = [];

  for (const symbolA of SYMBOLS) {
    const assetA = await Asset.findOne({ where: { symbol: symbolA } });

    if (!assetA) {
      console.log(`Актив ${symbolA} не найден`);
      continue;
    }

    for (const symbolB of SYMBOLS) {
      const assetB = await Asset.findOne({ where: { symbol: symbolB } });

      if (!assetB) {
        console.log(`Актив ${symbolB} не найден`);
        continue;
      }

      if (symbolA === symbolB) {
        continue;
      }

      if (!processedPairs.checkPair(symbolA, symbolB)) {
        continue;
      }

      processedPairs.setPairProcessed(symbolA, symbolB);

      timeEnvironment.currentTime = backtestTimeStart;

      const dateTimeProvider = new FakeDateTimeProvider(timeEnvironment);
      const dataProvider = new FakeDataProvider(timeEnvironment);
      const streamDataProvider = new FakeStreamDataProvider();

      const strategy = new MeanReversionStrategy(symbolA, symbolB, '1m', {
        dateTimeProvider,
        dataProvider,
        streamDataProvider,
      });

      let openTradeInfo: null | {
        position: 'long-short' | 'short-long';
        openPriceA: number;
        openPriceB: number;
        openTime: number;
      } = null;

      strategy.on('signal', (signal: TSignal) => {
        switch (signal.type) {
          case 'open':
            openTradeInfo = {
              position: signal.position,
              openTime: timeEnvironment.currentTime,
              openPriceA: signal.symbolA.price,
              openPriceB: signal.symbolB.price,
            };
            strategy.positionEnterAccepted(signal.position);
            break;
          case 'close':
            if (openTradeInfo) {
              if (timeEnvironment.currentTime - openTradeInfo.openTime < 5 * 1000) {
                strategy.positionExitRejected();
                return;
              }

              tradesReport.push({
                assetA,
                assetB,
                position: openTradeInfo.position,
                openTime: openTradeInfo.openTime,
                closeTime: timeEnvironment.currentTime,
                openPriceA: openTradeInfo.openPriceA,
                closePriceA: signal.symbolA.price,
                openPriceB: openTradeInfo.openPriceB,
                closePriceB: signal.symbolB.price,
              });
            }
            openTradeInfo = null;
            strategy.positionExitAccepted();
            break;
        }
      });

      const allTrades = await Trade.findAll({
        where: {
          symbol: { [Op.in]: [symbolA, symbolB] },
          timestamp: { [Op.gte]: backtestTimeStart },
        },
        order: [['timestamp', 'ASC']],
      });

      await strategy.start();

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
    }
  }

  const allCsvRows = [
    [
      'Пара',
      '№',
      'Позиция',
      'A (открытие → закрытие)',
      'B (открытие → закрытие)',
      'Открытие',
      'Закрытие',
      'Прибыль %',
    ].join(','),
  ];

  if (tradesReport.length > 1) {
    const dataDir = path.resolve(process.cwd(), 'data');
    const fileName = `backtest-report-all-pairs.csv`;
    const filePath = path.join(dataDir, fileName);

    const tradesReportWithProfit = R.pipe(
      tradesReport,
      R.map((trade) => {
        let profit = 0;

        if (trade.position === 'long-short') {
          profit = trade.closePriceA - trade.openPriceA + (trade.openPriceB - trade.closePriceB);
        } else {
          profit = trade.openPriceA - trade.closePriceA + (trade.closePriceB - trade.openPriceB);
        }

        const tradesCount = 4;
        const positionDurationInHours = Math.ceil((trade.closeTime - trade.openTime) / 3600);

        const base = Math.abs(trade.openPriceA) + Math.abs(trade.openPriceB);
        const profitPercent =
          (profit / base -
            tradesCount * OPEN_POSITION_COMMISSION_RATE -
            positionDurationInHours * MARGIN_HOUR_COMMISSION_RATE) *
          100;

        return {
          ...trade,
          profitPercent,
        };
      }),
      R.sortBy(R.prop('profitPercent')),
    );

    R.pipe(
      tradesReportWithProfit,
      R.forEach((trade, idx) => {
        const openTimeStr = new Date(trade.openTime).toISOString();
        const closeTimeStr = new Date(trade.closeTime).toISOString();

        allCsvRows.push(
          [
            `${trade.assetA.symbol}/${trade.assetB.symbol}`,
            idx + 1,
            trade.position,
            `${trade.openPriceA.toFixed(trade.assetA.pricePrecision)} → ${trade.closePriceA.toFixed(trade.assetA.pricePrecision)}`,
            `${trade.openPriceB.toFixed(trade.assetB.pricePrecision)} → ${trade.closePriceB.toFixed(trade.assetB.pricePrecision)}`,
            openTimeStr,
            closeTimeStr,
            trade.profitPercent.toFixed(3),
          ].join(','),
        );
      }),
    );

    const totalProfitPercent = R.pipe(
      tradesReportWithProfit,
      R.reduce((acc, item) => acc + item.profitPercent, 0),
    );

    console.log(
      `Сделки: ${tradesReportWithProfit.length}, Среднее время сделки: ${R.pipe(
        tradesReportWithProfit,
        R.map((trade) => (trade.closeTime - trade.openTime) / 1000 / 60),
        R.meanBy((x) => x),
        R.round(2),
      )}m, Средняя прибыль: ${(totalProfitPercent / tradesReportWithProfit.length).toFixed(3)}%`,
    );

    await fs.writeFile(filePath, allCsvRows.join('\n'), 'utf8');
    console.log(`CSV-отчёт по всем парам сохранён: ${filePath}`);
  } else {
    console.log('Нет сделок ни по одной паре');
  }
})();
