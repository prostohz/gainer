import { mean, std } from 'mathjs';

import { BetaHedge } from '../BetaHedge/BetaHedge';
import { TIndicatorShortCandle } from '../types';

export class ZScore {
  private betaHedge: BetaHedge;

  constructor() {
    this.betaHedge = new BetaHedge();
  }

  private calculate(x: number[], y: number[], beta: number): number {
    // Определяем минимальную длину массивов
    const minLength = Math.min(x.length, y.length);
    const spreadSeries: number[] = [];

    // Рассчитываем разницу между ценами закрытия
    for (let i = 0; i < minLength; i++) {
      spreadSeries.push(x[i] - y[i] * beta);
    }

    const spreadMean = Number(mean(spreadSeries));
    const spreadStd = Number(std(spreadSeries));

    return (spreadSeries[spreadSeries.length - 1] - spreadMean) / spreadStd;
  }

  public zScoreByPrices(
    candlesA: TIndicatorShortCandle[],
    candlesB: TIndicatorShortCandle[],
    beta: number,
  ) {
    const minLength = Math.min(candlesA.length, candlesB.length);
    if (minLength < 2) {
      console.warn('ZScore: prices series have less than 2 observations:', minLength);

      return null;
    }

    const candlesAClosePrices = candlesA.slice(-minLength).map((candle) => candle.close);
    const candlesBClosePrices = candlesB.slice(-minLength).map((candle) => candle.close);

    if (!beta) {
      console.warn('ZScore: beta is null');

      return null;
    }

    return this.calculate(candlesAClosePrices, candlesBClosePrices, beta);
  }

  /**
   * Вычисляет логарифмические доходности по массиву свечей
   */
  private getLogReturns(candles: TIndicatorShortCandle[]) {
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1].close;
      const curr = candles[i].close;
      if (prev > 0 && curr > 0) {
        returns.push(Math.log(curr / prev));
      } else {
        returns.push(0);
      }
    }
    return returns;
  }

  /**
   * Рассчитывает Z-Score по доходностям (логарифмическим)
   */
  public zScoreByReturns(
    candlesA: TIndicatorShortCandle[],
    candlesB: TIndicatorShortCandle[],
    beta: number,
  ) {
    const minLength = Math.min(candlesA.length, candlesB.length);
    if (minLength < 2) {
      console.warn(
        'ZScore: prices series have less than 2 observations:',
        candlesA.length,
        candlesB.length,
      );

      return null;
    }

    const returnsA = this.getLogReturns(candlesA.slice(-minLength));
    const returnsB = this.getLogReturns(candlesB.slice(-minLength));

    if (!beta) {
      console.warn('ZScore: beta is null');

      return null;
    }

    return this.calculate(returnsA, returnsB, beta);
  }

  public rollingZScoreByPrices(
    candlesA: TIndicatorShortCandle[],
    candlesB: TIndicatorShortCandle[],
    window: number = 100,
  ) {
    const minLength = Math.min(candlesA.length, candlesB.length);
    if (minLength < window) {
      return [];
    }

    const result: { timestamp: number; value: number | null }[] = [];

    for (let i = window; i < minLength; i++) {
      const windowA = candlesA.slice(i - window, i + 1);
      const windowB = candlesB.slice(i - window, i + 1);

      const timestamp = Number(candlesA[i].openTime);

      const beta = this.betaHedge.calculateBeta(windowA, windowB);

      if (!beta) {
        console.warn('ZScore: beta is null');

        return [];
      }

      const value = this.zScoreByPrices(windowA, windowB, beta);

      result.push({
        timestamp,
        value,
      });
    }

    return result;
  }

  /**
   * Рассчитывает скользящий Z-Score по доходностям (логарифмическим)
   */
  public rollingZScoreByReturns(
    candlesA: TIndicatorShortCandle[],
    candlesB: TIndicatorShortCandle[],
    window: number = 100,
  ) {
    const minLength = Math.min(candlesA.length, candlesB.length);
    if (minLength < window + 1) {
      return [];
    }

    const result: { timestamp: number; value: number | null }[] = [];

    for (let i = window; i < minLength; i++) {
      const windowA = candlesA.slice(i - window, i + 1);
      const windowB = candlesB.slice(i - window, i + 1);

      const beta = this.betaHedge.calculateBeta(windowA, windowB);

      if (!beta) {
        console.warn('ZScore: beta is null');

        return [];
      }

      const timestamp = Number(candlesA[i].openTime);
      const value = this.zScoreByReturns(windowA, windowB, beta);

      result.push({
        timestamp,
        value,
      });
    }

    return result;
  }
}
