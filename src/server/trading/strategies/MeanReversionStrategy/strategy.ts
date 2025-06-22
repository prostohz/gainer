import EventEmitter from 'events';

import { TTimeframe } from '../../../../shared/types';
import { timeframeToMilliseconds } from '../../../utils/timeframe';
import { TCandle } from '../../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';
import { TIndicatorCandle } from '../../indicators/types';
import { ZScore } from '../../indicators/ZScore/ZScore';
import { BetaHedge } from '../../indicators/BetaHedge/BetaHedge';
import { ADX } from '../../indicators/ADX/ADX';
import { TEnvironment, TDataProvider, TStreamDataProvider } from '../types';
import { calculateRoi } from './roi';

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
  beta: number;
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

type TOpenPosition = {
  direction: TPositionDirection;
  quantityA: number;
  quantityB: number;
  openPriceA: number;
  openPriceB: number;
  openTime: number;
};

export type TSignal = TOpenSignal | TCloseSignal | TStopLossSignal;

type TState =
  | 'scanningForEntry' // Сканирование для возможности выставить прямую сделку
  | 'waitingForEntry' // Ожидание выставления прямой сделки
  | 'scanningForExit' // Сканирование для возможности выставить обратную сделку
  | 'waitingForExit' // Ожидание выставления обратной сделки
  | 'suspended'; // Стратегия приостановлена

export class MeanReversionStrategy extends EventEmitter {
  private readonly dataProvider: TDataProvider;
  private readonly streamDataProvider: TStreamDataProvider;

  // Параметры торговой пары
  private readonly symbolA: string;
  private readonly symbolB: string;
  private readonly timeframe: TTimeframe;

  // Параметры стратегии
  private readonly CANDLES_COUNT = 288;
  private readonly CANDLES_COUNT_FOR_BETA = 60;
  private readonly CANDLES_COUNT_FOR_Z_SCORE = 60;
  private readonly CANDLES_COUNT_FOR_ADX = 288;

  private readonly Z_SCORE_ENTRY = 3.0;
  private readonly Z_SCORE_EXIT = 0.0;
  private readonly Z_SCORE_STOP_LOSS = 5.0;

  private readonly STOP_LOSS_RATE_PERCENT = 1.0;

  private state: TState = 'suspended';

  private candlesA: TIndicatorCandle[] = [];
  private candlesB: TIndicatorCandle[] = [];

  private position: TOpenPosition | null = null;

  private readonly ANALYSIS_THROTTLE_MS = 1_000;
  private lastAnalysisTime = 0;

  private adx: ADX;

  constructor(symbolA: string, symbolB: string, timeframe: TTimeframe, environment: TEnvironment) {
    super();
    this.symbolA = symbolA;
    this.symbolB = symbolB;
    this.timeframe = timeframe;

    this.dataProvider = environment.dataProvider;
    this.streamDataProvider = environment.streamDataProvider;

    this.adx = new ADX();
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

  private async loadHistoricalCandles(): Promise<void> {
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

  private calculateBeta(): number | null {
    return new BetaHedge().calculateBeta(
      this.candlesA.slice(-this.CANDLES_COUNT_FOR_BETA),
      this.candlesB.slice(-this.CANDLES_COUNT_FOR_BETA),
    );
  }

  private calculateZScore(beta: number): number | null {
    return new ZScore().zScoreByPrices(
      this.candlesA.slice(-this.CANDLES_COUNT_FOR_Z_SCORE),
      this.candlesB.slice(-this.CANDLES_COUNT_FOR_Z_SCORE),
      beta,
    );
  }

  private calculateADX(): number | null {
    return this.adx.calculateADX(this.candlesA.slice(-this.CANDLES_COUNT_FOR_ADX)) ?? null;
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

  private analyzeScanningForEntry(): void {
    const lastCandleA = this.candlesA.at(-1);
    const lastCandleB = this.candlesB.at(-1);

    if (!lastCandleA || !lastCandleB) {
      return;
    }

    const adx = this.calculateADX();
    if (!adx) {
      throw new Error('ADX is null');
    }

    if (this.adx.getTrendStrength(adx) !== 'weak') {
      return;
    }

    const beta = this.calculateBeta();
    if (!beta) {
      throw new Error('Beta is null');
    }

    const zScore = this.calculateZScore(beta);
    if (!zScore) {
      throw new Error('Z-score is null');
    }

    if (zScore >= this.Z_SCORE_STOP_LOSS || zScore <= -this.Z_SCORE_STOP_LOSS) {
      return;
    }

    const lastCloseA = lastCandleA.close;
    const lastCloseB = lastCandleB.close;

    if (zScore >= this.Z_SCORE_ENTRY) {
      // Сигнал на открытие: Short A / Long B
      this.emit('signal', {
        type: 'open',
        direction: 'sell-buy',
        symbolA: { symbol: this.symbolA, action: 'sell', price: lastCloseA },
        symbolB: { symbol: this.symbolB, action: 'buy', price: lastCloseB },
        beta,
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
        beta,
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

    const roi = calculateRoi(
      direction,
      this.symbolA,
      this.symbolB,
      this.position.quantityA,
      this.position.quantityB,
      this.position.openPriceA,
      this.position.openPriceB,
      priceA,
      priceB,
    );

    if (roi <= -this.STOP_LOSS_RATE_PERCENT) {
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
        reason: `Stop-loss triggered by price loss: ${roi.toFixed(2)}%`,
      } as TStopLossSignal);

      this.state = 'waitingForExit';

      return;
    }

    const beta = this.calculateBeta();
    if (!beta) {
      throw new Error('Beta is null');
    }

    const zScore = this.calculateZScore(beta);
    if (!zScore) {
      throw new Error('Z-score is null');
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

  public positionEnterAccepted(position: TOpenPosition): void {
    this.position = position;
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

    await this.loadHistoricalCandles();

    this.state = 'scanningForEntry';
  }

  public stop(): void {
    this.streamDataProvider.unsubscribeMultiple([
      { symbol: this.symbolA, type: 'trade' },
      { symbol: this.symbolB, type: 'trade' },
    ]);
    this.removeAllListeners();

    this.position = null;
    this.state = 'suspended';
  }
}
