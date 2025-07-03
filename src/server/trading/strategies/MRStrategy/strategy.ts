import EventEmitter from 'events';
import { std, abs } from 'mathjs';

import { TTimeframe } from '../../../../shared/types';
import { timeframeToMilliseconds } from '../../../utils/timeframe';
import { TCandle } from '../../providers/Binance/spot/BinanceHTTPClient';
import { TBinanceTrade } from '../../providers/Binance/spot/BinanceStreamClient';
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
  private readonly timeframe: TTimeframe = '1m';

  private readonly dataProvider: TDataProvider;
  private readonly streamDataProvider: TStreamDataProvider;

  // Параметры торговой пары
  private assetA: { baseAsset: string; quoteAsset: string } | null = null;
  private assetB: { baseAsset: string; quoteAsset: string } | null = null;

  private assetPrices: Record<string, number> = {};

  private readonly CANDLES_COUNT = 1440;
  private readonly CANDLES_COUNT_FOR_BETA = 60;
  private readonly CANDLES_COUNT_FOR_Z_SCORE = 60;
  private readonly CANDLES_COUNT_FOR_ADX = 720;
  private readonly CANDLES_COUNT_FOR_SPREAD_VOLATILITY = 240; // 4 часа для волатильности спреда

  private readonly Z_SCORE_ENTRY = 3.0;
  private readonly Z_SCORE_EXIT = 0.0;

  // Динамический стоп-лосс параметры
  private readonly STOP_LOSS_VOLATILITY_MULTIPLIER = 3.0; // Коэффициент: SL = multiplier * σ
  private readonly MIN_STOP_LOSS_RATE_PERCENT = 1.0; // Минимальный стоп-лосс
  private readonly MAX_STOP_LOSS_RATE_PERCENT = Infinity; // Максимальный стоп-лосс TODO: make it reasonable
  private readonly MIN_SAMPLES_FOR_VOLATILITY = 30; // Минимум свечей для расчёта волатильности

  private state: TState = 'suspended';

  private candlesA: TIndicatorCandle[] = [];
  private candlesB: TIndicatorCandle[] = [];

  private position: TOpenPosition | null = null;

  private adx: ADX;
  private betaHedge: BetaHedge;
  private zScore: ZScore;

  get symbolA() {
    if (!this.assetA) {
      throw new Error('Asset A is not set');
    }

    return `${this.assetA.baseAsset}${this.assetA.quoteAsset}`;
  }

  get symbolB() {
    if (!this.assetB) {
      throw new Error('Asset B is not set');
    }

    return `${this.assetB.baseAsset}${this.assetB.quoteAsset}`;
  }

  constructor(environment: TEnvironment) {
    super();

    this.dataProvider = environment.dataProvider;
    this.streamDataProvider = environment.streamDataProvider;

    this.adx = new ADX();
    this.betaHedge = new BetaHedge();
    this.zScore = new ZScore();
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

  public setAssetPrices(assetPrices: Record<string, number>): void {
    this.assetPrices = assetPrices;
  }

  public async start(
    assetA: { baseAsset: string; quoteAsset: string },
    assetB: { baseAsset: string; quoteAsset: string },
  ): Promise<void> {
    this.assetA = assetA;
    this.assetB = assetB;

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
    this.streamDataProvider.off('trade', this.onPriceUpdate);
    this.removeAllListeners();

    this.position = null;
    this.state = 'suspended';
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

  private async loadHistoricalCandles() {
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
        throw new Error('No candles for strategy');
      }

      this.candlesA = this.formatCandle(newCandlesA);
      this.candlesB = this.formatCandle(newCandlesB);
    } catch (error) {
      console.error('Error updating historical data:', error);
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

  private checkTrendAcceptable = () => {
    const candlesAAdx = this.adx.calculateADX(this.candlesA.slice(-this.CANDLES_COUNT_FOR_ADX));
    const candlesBAdx = this.adx.calculateADX(this.candlesB.slice(-this.CANDLES_COUNT_FOR_ADX));
    if (!candlesAAdx || !candlesBAdx) {
      console.warn('ADX is null, trend is not acceptable');
      return false;
    }

    if (
      this.adx.getTrendStrength(candlesAAdx) !== 'weak' ||
      this.adx.getTrendStrength(candlesBAdx) !== 'weak'
    ) {
      return false;
    }

    return true;
  };

  private calculateBeta = () => {
    return this.betaHedge.calculateBeta(
      this.candlesA.slice(-this.CANDLES_COUNT_FOR_BETA),
      this.candlesB.slice(-this.CANDLES_COUNT_FOR_BETA),
    );
  };

  private calculateZScore = (beta: number) => {
    return this.zScore.zScoreByPrices(
      this.candlesA.slice(-this.CANDLES_COUNT_FOR_Z_SCORE),
      this.candlesB.slice(-this.CANDLES_COUNT_FOR_Z_SCORE),
      beta,
    );
  };

  private onPriceUpdate = (trade: TBinanceTrade) => {
    try {
      if (this.candlesA.length === 0 || this.candlesB.length === 0) {
        return;
      }

      this.updateLastCandle(trade);
      this.performAnalysis();
    } catch (error) {
      console.error('Error updating price:', error);
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

    const beta = this.calculateBeta();
    if (!beta) {
      console.warn('Beta is null, stop-loss is not triggered');
      return;
    }

    const zScore = this.calculateZScore(beta);
    if (!zScore) {
      console.warn('Z-score is null, stop-loss is not triggered');
      return;
    }

    if (zScore <= this.Z_SCORE_ENTRY && zScore >= -this.Z_SCORE_ENTRY) {
      return;
    }

    if (!this.checkTrendAcceptable()) {
      return;
    }

    const lastCloseA = lastCandleA.close;
    const lastCloseB = lastCandleB.close;

    if (zScore >= this.Z_SCORE_ENTRY) {
      // Сигнал на открытие: Short A / Long B
      this.emit('signal', {
        type: 'open',
        direction: 'sell-buy',
        symbolA: {
          action: 'sell',
          price: lastCloseA,
        },
        symbolB: {
          action: 'buy',
          price: lastCloseB,
        },
        beta,
        reason: `High Z-score: ${zScore.toFixed(2)}`,
      } as TOpenSignal);

      this.state = 'waitingForEntry';
    } else if (zScore <= -this.Z_SCORE_ENTRY) {
      // Сигнал на открытие: Long A / Short B
      this.emit('signal', {
        type: 'open',
        direction: 'buy-sell',
        symbolA: {
          action: 'buy',
          price: lastCloseA,
        },
        symbolB: {
          action: 'sell',
          price: lastCloseB,
        },
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
      {
        direction,
        assetA: this.assetA!,
        assetB: this.assetB!,
        quantityA: this.position.quantityA,
        quantityB: this.position.quantityB,
        openPriceA: this.position.openPriceA,
        openPriceB: this.position.openPriceB,
        closePriceA: priceA,
        closePriceB: priceB,
      },
      this.assetPrices,
    );

    const beta = this.calculateBeta();
    if (!beta) {
      console.warn('Beta is null, using minimum stop-loss');
      return;
    }

    // Рассчитываем динамический стоп-лосс с использованием mathjs
    const dynamicStopLoss = this.calculateDynamicStopLoss(beta);

    if (roi <= -dynamicStopLoss) {
      this.emit('signal', {
        type: 'stopLoss',
        direction: direction,
        symbolA: {
          action: direction === 'sell-buy' ? 'buy' : 'sell',
          price: priceA,
        },
        symbolB: {
          action: direction === 'sell-buy' ? 'sell' : 'buy',
          price: priceB,
        },
        reason: `Stop-loss triggered by price loss: ROI ${roi.toFixed(2)}% ≤ -${dynamicStopLoss.toFixed(2)}%`,
      } as TStopLossSignal);

      this.state = 'waitingForExit';
      return;
    }

    const zScore = this.calculateZScore(beta);
    if (!zScore) {
      console.warn('Z-score is null, stop-loss is not triggered');
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
          action: direction === 'sell-buy' ? 'buy' : 'sell',
          price: priceA,
        },
        symbolB: {
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

  /**
   * Рассчитывает дополнительные статистики спреда для анализа
   * @param beta Коэффициент бета
   * @returns Объект со статистиками спреда
   */
  private calculateSpreadStatistics(beta: number): {
    volatility: number | null;
    maxDrawdown: number | null;
  } {
    const result = {
      volatility: null,
      maxDrawdown: null,
    } as {
      volatility: number | null;
      maxDrawdown: number | null;
    };

    const candlesCount = Math.min(
      this.candlesA.length,
      this.candlesB.length,
      this.CANDLES_COUNT_FOR_SPREAD_VOLATILITY,
    );

    if (candlesCount < this.MIN_SAMPLES_FOR_VOLATILITY) {
      return result;
    }

    const startIndex = Math.max(0, this.candlesA.length - candlesCount);
    const spreads: number[] = [];

    for (let i = startIndex; i < this.candlesA.length; i++) {
      const priceA = this.candlesA[i].close;
      const priceB = this.candlesB[i].close;
      const spread = priceA - beta * priceB;
      spreads.push(spread);
    }

    if (spreads.length < 2) {
      return result;
    }

    const spreadReturns: number[] = [];
    for (let i = 1; i < spreads.length; i++) {
      const prevSpread = spreads[i - 1];
      if (abs(prevSpread) > 1e-10) {
        const spreadReturn = ((spreads[i] - prevSpread) / abs(prevSpread)) * 100;
        spreadReturns.push(spreadReturn);
      }
    }

    if (spreadReturns.length < 10) {
      return result;
    }

    const volatility = Number(std(spreadReturns));

    let maxDrawdown = 0;
    let peak = spreads[0];
    for (const spread of spreads) {
      if (spread > peak) {
        peak = spread;
      }
      const drawdown = ((peak - spread) / abs(peak)) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    result.volatility = isFinite(volatility) ? volatility : null;
    result.maxDrawdown = isFinite(maxDrawdown) ? maxDrawdown : null;

    return result;
  }

  /**
   * Рассчитывает динамический стоп-лосс на основе волатильности спреда
   * @param beta Коэффициент бета
   * @returns Динамический стоп-лосс в процентах
   */
  private calculateDynamicStopLoss(beta: number): number {
    const stats = this.calculateSpreadStatistics(beta);

    if (!stats.volatility) {
      console.warn('Cannot calculate spread volatility, using minimum stop-loss');
      return this.MIN_STOP_LOSS_RATE_PERCENT;
    }

    // Основная формула: SL = multiplier * σ
    let dynamicStopLoss = this.STOP_LOSS_VOLATILITY_MULTIPLIER * stats.volatility;

    // Дополнительная корректировка на основе максимальной просадки
    if (stats.maxDrawdown && stats.maxDrawdown > 0) {
      // Если историческая просадка была больше, чем наш расчётный стоп-лосс,
      // увеличиваем стоп-лосс с учётом этой информации
      const historicalFactor = 1.2; // 20% буфер сверх исторической просадки
      const adjustedStopLoss = stats.maxDrawdown * historicalFactor;

      // Берём максимум из двух методов расчёта
      dynamicStopLoss = Math.max(dynamicStopLoss, adjustedStopLoss);
    }

    // Ограничиваем стоп-лосс в разумных пределах
    const clampedStopLoss = Math.max(
      this.MIN_STOP_LOSS_RATE_PERCENT,
      Math.min(this.MAX_STOP_LOSS_RATE_PERCENT, dynamicStopLoss),
    );

    return clampedStopLoss;
  }
}
