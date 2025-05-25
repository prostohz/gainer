import { TIndicatorCandle } from '../types';

export class PearsonCorrelation {
  private calculate(x: number[], y: number[]): number {
    const n = x.length;

    // Проверка на достаточное количество данных
    if (n < 2) {
      return 0;
    }

    // Рассчитываем суммы
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    // Рассчитываем корреляцию Пирсона
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    // Избегаем деления на ноль
    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  public calculateCorrelation(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]): number {
    if (!candlesA.length || !candlesB.length) {
      return 0;
    }

    const minLength = Math.min(candlesA.length, candlesB.length);

    // Извлекаем цены закрытия для расчета корреляции
    const pricesA = candlesA.slice(0, minLength).map((candle) => candle.close);
    const pricesB = candlesB.slice(0, minLength).map((candle) => candle.close);

    return this.calculate(pricesA, pricesB);
  }

  public calculateCorrelationRolling(
    candlesA: TIndicatorCandle[],
    candlesB: TIndicatorCandle[],
  ): { timestamp: number; value: number }[] {
    const ROLLING_WINDOW = 100;

    const minLength = Math.min(candlesA.length, candlesB.length);

    // Если данных меньше чем размер окна - возвращаем пустой массив
    if (minLength < ROLLING_WINDOW) {
      return [];
    }

    const result: { timestamp: number; value: number }[] = [];

    for (let i = ROLLING_WINDOW; i < minLength; i++) {
      const seriesA = candlesA.slice(i - ROLLING_WINDOW, i);
      const seriesB = candlesB.slice(i - ROLLING_WINDOW, i);

      result.push({
        timestamp: Number(candlesA[i].openTime),
        value: this.calculateCorrelation(seriesA, seriesB),
      });
    }

    return result;
  }
}
