import { calculateMean, calculateStandardDeviation } from '../../../utils/math';
import { TIndicatorCandle } from '../types';

export class ZScore {
  private calculate(x: number[], y: number[]): number {
    // Определяем минимальную длину массивов
    const minLength = Math.min(x.length, y.length);
    const spreadSeries: number[] = [];

    // Рассчитываем разницу между ценами закрытия
    for (let i = 0; i < minLength; i++) {
      spreadSeries.push(x[i] - y[i]);
    }

    const mean = calculateMean(spreadSeries);
    const stdDev = calculateStandardDeviation(spreadSeries, mean);

    return (spreadSeries[spreadSeries.length - 1] - mean) / stdDev;
  }

  public zScoreByPrices(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]): number {
    if (!candlesA.length || !candlesB.length) {
      return 0;
    }

    const candlesAClosePrices = candlesA.map((candle) => candle.close);
    const candlesBClosePrices = candlesB.map((candle) => candle.close);

    return this.calculate(candlesAClosePrices, candlesBClosePrices);
  }

  /**
   * Вычисляет логарифмические доходности по массиву свечей
   */
  private getLogReturns(candles: TIndicatorCandle[]): number[] {
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
  public zScoreByReturns(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]): number {
    if (candlesA.length < 2 || candlesB.length < 2) {
      return 0;
    }
    const minLength = Math.min(candlesA.length, candlesB.length);
    const returnsA = this.getLogReturns(candlesA.slice(0, minLength));
    const returnsB = this.getLogReturns(candlesB.slice(0, minLength));

    return this.calculate(returnsA, returnsB);
  }

  public rollingZScoreByPrices(
    candlesA: TIndicatorCandle[],
    candlesB: TIndicatorCandle[],
  ): { timestamp: number; value: number }[] {
    const ROLLING_WINDOW = 100;

    const minLength = Math.min(candlesA.length, candlesB.length);
    if (minLength < ROLLING_WINDOW) {
      return [];
    }

    const result: { timestamp: number; value: number }[] = [];

    for (let i = ROLLING_WINDOW; i < minLength; i++) {
      const windowA = candlesA.slice(i - ROLLING_WINDOW, i + 1);
      const windowB = candlesB.slice(i - ROLLING_WINDOW, i + 1);

      const timestamp = Number(candlesA[i].openTime);
      const value = this.zScoreByPrices(windowA, windowB);

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
    candlesA: TIndicatorCandle[],
    candlesB: TIndicatorCandle[],
    window: number = 100,
  ): { timestamp: number; value: number }[] {
    const minLength = Math.min(candlesA.length, candlesB.length);
    if (minLength < window + 1) {
      return [];
    }

    const returnsA = this.getLogReturns(candlesA.slice(0, minLength));
    const returnsB = this.getLogReturns(candlesB.slice(0, minLength));
    const result: { timestamp: number; value: number }[] = [];

    for (let i = window; i < returnsA.length && i < returnsB.length; i++) {
      const windowA = returnsA.slice(i - window, i + 1);
      const windowB = returnsB.slice(i - window, i + 1);

      const timestamp = Number(candlesA[i + 1]?.openTime ?? candlesA[candlesA.length - 1].openTime);
      const value = this.calculate(windowA, windowB);

      result.push({
        timestamp,
        value,
      });
    }
    return result;
  }
}
