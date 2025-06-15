import EventEmitter from 'events';
import * as R from 'remeda';

import { TTimeframe } from '../../../../shared/types';
import { timeframeToMilliseconds } from '../../../utils/timeframe';
import { TCandle } from '../../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';
import { PearsonCorrelation } from '../../indicators/PearsonCorrelation/PearsonCorrelation';
import { ZScore } from '../../indicators/ZScore/ZScore';
import { ADX } from '../../indicators/ADX/ADX';
import { TEnvironment, TDataProvider, TStreamDataProvider } from '../types';
import { TIndicatorCandle } from '../../indicators/types';

export type TPositionDirection = 'buy-sell' | 'sell-buy';
type TActionType = 'buy' | 'sell';
type TSignalType = 'open' | 'close' | 'stopLoss';

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
  direction: TPositionDirection;
  symbolA: TSignalSymbol;
  symbolB: TSignalSymbol;
};

type TCloseSignal = TBaseSignal & {
  type: 'close';
  direction: TPositionDirection;
  symbolA: TSignalSymbol;
  symbolB: TSignalSymbol;
};

type TStopLossSignal = TBaseSignal & {
  type: 'stopLoss';
  direction: TPositionDirection;
  symbolA: TSignalSymbol;
  symbolB: TSignalSymbol;
};

export type TSignal = TOpenSignal | TCloseSignal | TStopLossSignal;

type TState =
  | 'scanningForEntry' // Сканирование для возможности выставить прямую сделку
  | 'waitingForEntry' // Ожидание выставления прямой сделки
  | 'scanningForExit' // Сканирование для возможности выставить обратную сделку
  | 'waitingForExit'; // Ожидание выставления обратной сделки

export class MeanReversionStrategy extends EventEmitter {
  private readonly dataProvider: TDataProvider;
  private readonly streamDataProvider: TStreamDataProvider;

  // Параметры торговой пары
  private readonly symbolA: string;
  private readonly symbolB: string;
  private readonly timeframe: TTimeframe;

  private readonly pearsonCorrelation: PearsonCorrelation;
  private readonly zScore: ZScore;
  private readonly adx: ADX;

  // Параметры стратегии
  private readonly CANDLES_COUNT = 30;

  private readonly Z_SCORE_ENTRY = 2.0;
  private readonly Z_SCORE_EXIT = 0.0;
  private readonly Z_SCORE_STOP_LOSS = 5.0;

  private readonly STOP_LOSS_RATE = 0.01;

  private readonly CORRELATION_THRESHOLD = 0.9;

  private readonly ADX_TREND_THRESHOLD = 25; // Минимальный ADX для определения тренда
  private readonly ADX_STRONG_TREND_THRESHOLD = 40; // Сильный тренд - не входим в сделку

  private state: TState = 'scanningForEntry';

  private candlesA: TIndicatorCandle[] = [];
  private candlesB: TIndicatorCandle[] = [];

  private position: TOpenSignal | null = null;

  private readonly ANALYSIS_THROTTLE_MS = 15_000;
  private lastAnalysisTime = 0;

  constructor(symbolA: string, symbolB: string, timeframe: TTimeframe, environment: TEnvironment) {
    super();
    this.symbolA = symbolA;
    this.symbolB = symbolB;
    this.timeframe = timeframe;

    this.pearsonCorrelation = new PearsonCorrelation();
    this.zScore = new ZScore();
    this.adx = new ADX();

    this.dataProvider = environment.dataProvider;
    this.streamDataProvider = environment.streamDataProvider;
  }

  private formatCandle(candles: TCandle[]): TIndicatorCandle[] {
    return candles.map((candle) => ({
      openTime: candle.openTime,
      closeTime: candle.closeTime,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume),
    }));
  }

  private async updateHistoricalCandles(): Promise<void> {
    try {
      const [newCandlesA, newCandlesB] = await Promise.all([
        this.dataProvider.fetchAssetCandles({
          symbol: this.symbolA,
          timeframe: this.timeframe,
          limit: this.CANDLES_COUNT,
        }),
        this.dataProvider.fetchAssetCandles({
          symbol: this.symbolB,
          timeframe: this.timeframe,
          limit: this.CANDLES_COUNT,
        }),
      ]);

      if (newCandlesA.length === 0 || newCandlesB.length === 0) {
        throw new Error('Нет свечей для стратегии');
      }

      this.candlesA = this.formatCandle(newCandlesA);
      this.candlesB = this.formatCandle(newCandlesB);
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
    const price = trade.p;
    const priceNumber = Number(price);

    // Если trade попадает в текущую свечу — обновляем её
    if (trade.T <= lastCandle.closeTime) {
      lastCandle.close = priceNumber;
      lastCandle.high = Math.max(lastCandle.high, priceNumber);
      lastCandle.low = Math.min(lastCandle.low, priceNumber);
    } else {
      // Если trade относится к новому бару — создаём новую свечу
      // Предполагаем, что openTime следующей свечи = lastCandle.closeTime + 1
      const timeframeMs = timeframeToMilliseconds(this.timeframe);
      const newOpenTime = lastCandle.closeTime + 1;
      const newCloseTime = newOpenTime + timeframeMs - 1;

      const newCandle: TIndicatorCandle = {
        openTime: newOpenTime,
        closeTime: newCloseTime,
        open: priceNumber,
        high: priceNumber,
        low: priceNumber,
        close: priceNumber,
        volume: 0,
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

      // Throttling анализа
      const tradeTime = trade.T;
      if (tradeTime - this.lastAnalysisTime >= this.ANALYSIS_THROTTLE_MS) {
        this.performAnalysis();
        this.lastAnalysisTime = tradeTime;
      }
    } catch (error) {
      console.error('Ошибка при обработке обновления цены:', error);
    }
  };

  private performAnalysis(): void {
    switch (this.state) {
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
  }

  /**
   * Проверяет наличие подходящего тренда с помощью ADX
   * Возвращает true, если тренд подходит для входа в mean reversion сделку
   */
  private hasAcceptableTrend(): boolean {
    if (this.candlesA.length < 30 || this.candlesB.length < 30) {
      return true; // Недостаточно данных для ADX - разрешаем торговлю
    }

    // Конвертируем свечи в формат для ADX
    const convertToIndicatorCandles = (candles: TIndicatorCandle[]) =>
      R.pipe(
        candles,
        R.map(R.pick(['openTime', 'closeTime', 'open', 'close', 'high', 'low', 'volume'])),
      );

    const adxDataA = this.adx.calculateFullADX(convertToIndicatorCandles(this.candlesA));
    const adxDataB = this.adx.calculateFullADX(convertToIndicatorCandles(this.candlesB));

    // Если не можем рассчитать ADX, разрешаем торговлю
    if (!adxDataA.adx || !adxDataB.adx) {
      return true;
    }

    // Проверяем силу тренда на обоих активах
    const strongTrendA = adxDataA.adx > this.ADX_STRONG_TREND_THRESHOLD;
    const strongTrendB = adxDataB.adx > this.ADX_STRONG_TREND_THRESHOLD;

    // Если на любом из активов сильный тренд, не входим в сделку
    if (strongTrendA || strongTrendB) {
      return false;
    }

    // Дополнительная проверка: если тренды умеренные, проверяем направление
    if (
      (adxDataA.adx > this.ADX_TREND_THRESHOLD || adxDataB.adx > this.ADX_TREND_THRESHOLD) &&
      typeof adxDataA.diPlus === 'number' &&
      typeof adxDataA.diMinus === 'number' &&
      typeof adxDataB.diPlus === 'number' &&
      typeof adxDataB.diMinus === 'number'
    ) {
      const trendDirectionA = this.adx.getTrendDirection(adxDataA.diPlus, adxDataA.diMinus);
      const trendDirectionB = this.adx.getTrendDirection(adxDataB.diPlus, adxDataB.diMinus);

      // Не торгуем если тренды в одном направлении и не боковые
      if (trendDirectionA === trendDirectionB && trendDirectionA !== 'sideways') {
        return false;
      }
    }

    // Если дошли до сюда - тренд подходит для mean reversion
    return true;
  }

  private hasAcceptableCorrelation(): boolean {
    const correlation = this.pearsonCorrelation.correlationByPrices(this.candlesA, this.candlesB);

    if (!correlation) {
      return false;
    }

    return correlation > this.CORRELATION_THRESHOLD;
  }

  private analyzeScanningForEntry(): void {
    const lastCandleA = this.candlesA.at(-1);
    const lastCandleB = this.candlesB.at(-1);

    if (!lastCandleA || !lastCandleB) {
      return;
    }

    const lastCloseA = lastCandleA.close;
    const lastCloseB = lastCandleB.close;

    // Проверяем наличие тренда с помощью ADX
    if (!this.hasAcceptableTrend()) {
      return;
    }

    // Проверяем наличие корреляции
    if (!this.hasAcceptableCorrelation()) {
      return;
    }

    const zScore = this.zScore.zScoreByPrices(this.candlesA, this.candlesB);
    if (!zScore) {
      return;
    }

    if (zScore >= this.Z_SCORE_ENTRY) {
      // Сигнал на открытие: Short A / Long B
      this.emit('signal', {
        type: 'open',
        direction: 'sell-buy',
        symbolA: { symbol: this.symbolA, action: 'sell', price: lastCloseA },
        symbolB: { symbol: this.symbolB, action: 'buy', price: lastCloseB },
        reason: `High Z-score: ${zScore.toFixed(2)}`,
      } as TOpenSignal);

      this.state = 'waitingForEntry';
    } else if (zScore <= -this.Z_SCORE_ENTRY) {
      // Сигнал на открытие: Long A / Short B
      this.emit('signal', {
        type: 'open',
        direction: 'buy-sell',
        symbolA: { symbol: this.symbolA, action: 'buy', price: lastCloseA },
        symbolB: { symbol: this.symbolB, action: 'sell', price: lastCloseB },
        reason: `Low Z-score: ${zScore.toFixed(2)}`,
      } as TOpenSignal);

      this.state = 'waitingForEntry';
    }
  }

  private analyzeWaitingForEntry(): void {
    if (this.position) {
      this.state = 'scanningForExit';
    }
  }

  private analyzeScanningForExit(): void {
    if (!this.position) {
      throw new Error('No position');
    }

    const lastCandleA = this.candlesA.at(-1);
    const lastCandleB = this.candlesB.at(-1);
    if (!lastCandleA || !lastCandleB) {
      return;
    }
    const priceA = lastCandleA.close;
    const priceB = lastCandleB.close;

    const { direction } = this.position;

    // Проверка на выход по стоп-лоссу по цене (STOP_LOSS_RATE)
    const entryPriceA = this.position.symbolA.price;
    const entryPriceB = this.position.symbolB.price;

    let pnl = 0;
    if (direction === 'sell-buy') {
      // Short A, Long B
      pnl = entryPriceA - priceA + (priceB - entryPriceB);
    } else {
      // Long A, Short B
      pnl = priceA - entryPriceA + (entryPriceB - priceB);
    }

    const base = Math.abs(entryPriceA) + Math.abs(entryPriceB);
    const pnlRate = pnl / base;

    if (pnlRate <= -this.STOP_LOSS_RATE) {
      this.emit('signal', {
        type: 'stopLoss',
        direction: direction,
        symbolA: {
          symbol: this.symbolA,
          action: direction === 'sell-buy' ? 'buy' : 'sell',
          price: priceA,
        },
        symbolB: {
          symbol: this.symbolB,
          action: direction === 'sell-buy' ? 'sell' : 'buy',
          price: priceB,
        },
        reason: `Stop-loss triggered by price loss: ${(pnlRate * 100).toFixed(2)}%`,
      } as TStopLossSignal);

      this.state = 'waitingForExit';

      return;
    }

    const zScore = this.zScore.zScoreByPrices(this.candlesA, this.candlesB);
    if (!zScore) {
      return;
    }

    const shouldZScoreStopLoss =
      (direction === 'sell-buy' && zScore >= this.Z_SCORE_STOP_LOSS) ||
      (direction === 'buy-sell' && zScore <= -this.Z_SCORE_STOP_LOSS);

    if (shouldZScoreStopLoss) {
      this.emit('signal', {
        type: 'stopLoss',
        direction: direction,
        symbolA: {
          symbol: this.symbolA,
          action: direction === 'sell-buy' ? 'buy' : 'sell',
          price: priceA,
        },
        symbolB: {
          symbol: this.symbolB,
          action: direction === 'sell-buy' ? 'sell' : 'buy',
          price: priceB,
        },
        reason: `Stop-loss triggered at Z-score: ${zScore.toFixed(2)}`,
      } as TStopLossSignal);

      this.state = 'waitingForExit';

      return;
    }

    const shouldClose =
      (direction === 'sell-buy' && zScore <= this.Z_SCORE_EXIT) ||
      (direction === 'buy-sell' && zScore >= -this.Z_SCORE_EXIT);

    if (shouldClose) {
      this.emit('signal', {
        type: 'close',
        direction: direction,
        symbolA: {
          symbol: this.symbolA,
          action: direction === 'sell-buy' ? 'buy' : 'sell',
          price: priceA,
        },
        symbolB: {
          symbol: this.symbolB,
          action: direction === 'sell-buy' ? 'sell' : 'buy',
          price: priceB,
        },
        reason: `Z-score mean reversion: ${zScore.toFixed(2)}`,
      } as TCloseSignal);

      this.state = 'waitingForExit';

      return;
    }
  }

  private analyzeWaitingForExit(): void {
    if (!this.position) {
      this.state = 'scanningForEntry';
    }
  }

  public positionEnterAccepted(signal: TOpenSignal): void {
    this.position = signal;
    this.state = 'scanningForExit';
  }

  public positionEnterRejected(): void {
    this.state = 'scanningForEntry';
  }

  public positionExitAccepted(): void {
    this.position = null;
    this.state = 'scanningForEntry';
  }

  public positionExitRejected(): void {
    this.state = 'scanningForExit';
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
