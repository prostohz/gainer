import EventEmitter from 'events';

import { TTimeframe } from '../../../../shared/types';
import { timeframeToMilliseconds } from '../../../utils/timeframe';
import { TCandle } from '../../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';
import { ZScore } from '../../indicators/ZScore/ZScore';
import { PearsonCorrelation } from '../../indicators/PearsonCorrelation/PearsonCorrelation';
import { Sma } from '../../indicators/Sma/Sma';
import { TEnvironment, TDateTimeProvider, TDataProvider, TStreamDataProvider } from '../types';

type TSignalType = 'open' | 'close' | 'invalidateEntry' | 'stopLoss';
type TPositionType = 'long-short' | 'short-long';
type TActionType = 'buy' | 'sell';

type TSignalSymbol = {
  symbol: string;
  action: TActionType;
  price: number;
};

type TBaseSignal = {
  type: TSignalType;
  reason: string;
};

type TOpenSignal = TBaseSignal & {
  type: 'open';
  position: TPositionType;
  symbolA: TSignalSymbol;
  symbolB: TSignalSymbol;
};

type TCloseSignal = TBaseSignal & {
  type: 'close';
  position: TPositionType;
  symbolA: TSignalSymbol;
  symbolB: TSignalSymbol;
};

export type TSignal = TOpenSignal | TCloseSignal;

type TPositionState =
  | 'scanningForEntry' // Сканирование для возможности выставить прямую сделку
  | 'waitingForEntry' // Ожидание выставления прямой сделки
  | 'scanningForExit' // Сканирование для возможности выставить обратную сделку
  | 'waitingForExit'; // Ожидание выставления обратной сделки

export class MeanReversionStrategy extends EventEmitter {
  private readonly zScore: ZScore;
  private readonly pearsonCorrelation: PearsonCorrelation;
  private readonly sma: Sma;
  private readonly dateTimeProvider: TDateTimeProvider;
  private readonly dataProvider: TDataProvider;
  private readonly streamDataProvider: TStreamDataProvider;

  // Параметры торговой пары
  private readonly symbolA: string;
  private readonly symbolB: string;
  private readonly timeframe: TTimeframe;

  // Параметры стратегии
  private readonly CANDLES_COUNT = 100;
  private readonly Z_SCORE_ENTRY = 3.0;
  private readonly Z_SCORE_EXIT = 0.5;

  private currentPosition: TPositionType | null = null;
  private positionState: TPositionState = 'scanningForEntry';

  private candlesA: TCandle[] = [];
  private candlesB: TCandle[] = [];

  constructor(symbolA: string, symbolB: string, timeframe: TTimeframe, environment: TEnvironment) {
    super();
    this.symbolA = symbolA;
    this.symbolB = symbolB;
    this.timeframe = timeframe;

    this.zScore = new ZScore();
    this.pearsonCorrelation = new PearsonCorrelation();
    this.sma = new Sma();

    this.dateTimeProvider = environment.dateTimeProvider;
    this.dataProvider = environment.dataProvider;
    this.streamDataProvider = environment.streamDataProvider;
  }

  private async updateHistoricalCandles(): Promise<void> {
    try {
      const [newCandlesA, newCandlesB] = await Promise.all([
        this.dataProvider.fetchAssetCandles(this.symbolA, this.timeframe, this.CANDLES_COUNT),
        this.dataProvider.fetchAssetCandles(this.symbolB, this.timeframe, this.CANDLES_COUNT),
      ]);

      if (newCandlesA.length === 0 || newCandlesB.length === 0) {
        throw new Error('Нет свечей для стратегии');
      }

      this.candlesA = newCandlesA;
      this.candlesB = newCandlesB;
    } catch (error) {
      console.error('Ошибка при обновлении исторических данных:', error);
    }
  }

  private updateLastCandle(trade: TBinanceTrade): void {
    const candles = trade.s === this.symbolA ? this.candlesA : this.candlesB;

    if (candles.length === 0) {
      return;
    }

    const lastCandle = candles[candles.length - 1];
    const price = Number(trade.p);

    // Если trade попадает в текущую свечу — обновляем её
    if (trade.T <= lastCandle.closeTime) {
      lastCandle.close = price;
      lastCandle.high = Math.max(lastCandle.high, price);
      lastCandle.low = Math.min(lastCandle.low, price);
    } else {
      // Если trade относится к новому бару — создаём новую свечу
      // Предполагаем, что openTime следующей свечи = lastCandle.closeTime + 1
      const timeframeMs = timeframeToMilliseconds(this.timeframe);
      const newOpenTime = lastCandle.closeTime + 1;
      const newCloseTime = newOpenTime + timeframeMs - 1;

      const newCandle: TCandle = {
        openTime: newOpenTime,
        closeTime: newCloseTime,
        open: price,
        high: price,
        low: price,
        close: price,
        numberOfTrades: 1,
        volume: 0,
        quoteAssetVolume: 0,
        takerBuyBaseAssetVolume: 0,
        takerBuyQuoteAssetVolume: 0,
      };

      candles.push(newCandle);

      // Ограничиваем размер массива свечей
      if (candles.length > this.CANDLES_COUNT) {
        candles.shift();
      }
    }
  }

  private onPriceUpdate = (trade: TBinanceTrade) => {
    try {
      if (this.candlesA.length === 0 || this.candlesB.length === 0) {
        return;
      }

      this.updateLastCandle(trade);

      // Анализируем сигналы в зависимости от состояния
      switch (this.positionState) {
        case 'scanningForEntry':
          this.analyzeScanningForEntry();
          break;
        case 'waitingForEntry':
          this.analyzeWaitingForEntry();
          break;
        case 'scanningForExit':
          this.analyzeScanningForExit();
          break;
        case 'waitingForExit':
          this.analyzeWaitingForExit();
          break;
      }
    } catch (error) {
      console.error('Ошибка при обработке обновления цены:', error);
    }
  };

  private analyzeScanningForEntry(): void {
    const correlation = this.pearsonCorrelation.calculateCorrelation(this.candlesA, this.candlesB);
    if (correlation < 0.8) {
      return;
    }

    const lastCandleA = this.candlesA.at(-1);
    const lastCandleB = this.candlesB.at(-1);

    if (!lastCandleA || !lastCandleB) {
      return;
    }

    const lastCloseA = lastCandleA.close;
    const lastCloseB = lastCandleB.close;

    const zScore = this.zScore.calculateZScore(this.candlesA, this.candlesB);

    // Проверяем наличие тренда на одном из активов с помощью SMA
    // Если на одном из активов выраженный тренд, не входим в сделку

    // Определяем длину окна для SMA (например, 20 последних свечей)
    const SMA_WINDOW = 20;
    if (this.candlesA.length >= SMA_WINDOW && this.candlesB.length >= SMA_WINDOW) {
      const smaA = this.sma.calculateSMA(this.candlesA.slice(-SMA_WINDOW));
      const smaB = this.sma.calculateSMA(this.candlesB.slice(-SMA_WINDOW));

      // Проверяем, насколько сильно отличается цена закрытия от SMA
      // Если разница больше 1% — считаем, что есть тренд
      const trendThreshold = 0.01;

      const deviationA = Math.abs(lastCloseA - (smaA ?? lastCloseA)) / (smaA ?? 1);
      const deviationB = Math.abs(lastCloseB - (smaB ?? lastCloseB)) / (smaB ?? 1);

      if (deviationA > trendThreshold || deviationB > trendThreshold) {
        // Есть тренд на одном из активов — не входим
        return;
      }
    }

    if (zScore >= this.Z_SCORE_ENTRY) {
      // Сигнал на открытие: Short A / Long B
      this.emit('signal', {
        type: 'open',
        position: 'short-long',
        symbolA: { symbol: this.symbolA, action: 'sell', price: lastCloseA },
        symbolB: { symbol: this.symbolB, action: 'buy', price: lastCloseB },
        reason: `High Z-score: ${zScore.toFixed(2)}`,
      } as TOpenSignal);

      this.positionState = 'waitingForEntry';
    } else if (zScore <= -this.Z_SCORE_ENTRY) {
      // Сигнал на открытие: Long A / Short B
      this.emit('signal', {
        type: 'open',
        position: 'long-short',
        symbolA: { symbol: this.symbolA, action: 'buy', price: lastCloseA },
        symbolB: { symbol: this.symbolB, action: 'sell', price: lastCloseB },
        reason: `Low Z-score: ${zScore.toFixed(2)}`,
      } as TOpenSignal);

      this.positionState = 'waitingForEntry';
    }
  }

  private analyzeWaitingForEntry(): void {
    if (this.currentPosition) {
      this.positionState = 'scanningForExit';
    }
  }

  private analyzeScanningForExit(): void {
    const zScore = this.zScore.calculateZScore(this.candlesA, this.candlesB);

    const lastCandleA = this.candlesA.at(-1);
    const lastCandleB = this.candlesB.at(-1);

    if (!lastCandleA || !lastCandleB) {
      return;
    }

    const priceA = lastCandleA.close;
    const priceB = lastCandleB.close;

    const shouldClose =
      // Закрытие по возврату к среднему
      (this.currentPosition === 'short-long' && zScore <= this.Z_SCORE_EXIT) ||
      (this.currentPosition === 'long-short' && zScore >= -this.Z_SCORE_EXIT);

    if (shouldClose && this.currentPosition) {
      this.emit('signal', {
        type: 'close',
        position: this.currentPosition,
        symbolA: {
          symbol: this.symbolA,
          action: this.currentPosition === 'short-long' ? 'buy' : 'sell',
          price: priceA,
        },
        symbolB: {
          symbol: this.symbolB,
          action: this.currentPosition === 'short-long' ? 'sell' : 'buy',
          price: priceB,
        },
        reason: `Z-score mean reversion: ${zScore.toFixed(2)}`,
      } as TCloseSignal);

      this.positionState = 'waitingForExit';
    }
  }

  private analyzeWaitingForExit(): void {
    if (!this.currentPosition) {
      this.positionState = 'scanningForEntry';
    }
  }

  public positionEnterAccepted(position: TPositionType): void {
    this.currentPosition = position;
    this.positionState = 'scanningForExit';
  }

  public positionEnterRejected(): void {
    this.positionState = 'scanningForEntry';
  }

  public positionExitAccepted(): void {
    this.currentPosition = null;
    this.positionState = 'scanningForEntry';
  }

  public positionExitRejected(): void {
    this.positionState = 'scanningForExit';
  }

  public async start(): Promise<void> {
    this.streamDataProvider.on('trade', this.onPriceUpdate);
    this.streamDataProvider.subscribeMultiple([
      { symbol: this.symbolA, type: 'trade' },
      { symbol: this.symbolB, type: 'trade' },
    ]);

    await this.updateHistoricalCandles();
  }

  public stop(): void {
    this.streamDataProvider.unsubscribeMultiple([
      { symbol: this.symbolA, type: 'trade' },
      { symbol: this.symbolB, type: 'trade' },
    ]);
    this.removeAllListeners();
  }
}
