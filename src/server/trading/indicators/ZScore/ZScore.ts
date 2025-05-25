import { calculateMean, calculateStandardDeviation } from '../../../utils/math';
import { TIndicatorCandle } from '../types';

export class ZScore {
  private calculateSpread(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]): number[] {
    // Определяем минимальную длину массивов
    const minLength = Math.min(candlesA.length, candlesB.length);
    const spreadSeries: number[] = [];

    // Рассчитываем разницу между ценами закрытия
    for (let i = 0; i < minLength; i++) {
      spreadSeries.push(Number(candlesA[i].close) - Number(candlesB[i].close));
    }

    return spreadSeries;
  }

  public calculateZScore(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]): number {
    if (!candlesA.length || !candlesB.length) {
      return 0;
    }

    const spreadSeries = this.calculateSpread(candlesA, candlesB);
    const mean = calculateMean(spreadSeries);
    const stdDev = calculateStandardDeviation(spreadSeries, mean);

    // Избегаем деления на ноль
    if (stdDev === 0) {
      return 0;
    }

    // Берем последнее значение спреда для расчета текущего z-score
    const currentSpread = spreadSeries[spreadSeries.length - 1];

    return (currentSpread - mean) / stdDev;
  }

  public calculateZScoreRolling(
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
      const value = this.calculateZScore(windowA, windowB);

      result.push({
        timestamp,
        value,
      });
    }

    return result;
  }
}
