import * as R from 'remeda';

import { TTimeframe, TCandle } from '../../types';

export class ZScore {
  public calculateZScore(candlesA: TCandle[], candlesB: TCandle[]): number {
    // Проверяем, что у нас есть данные для расчета
    if (!candlesA.length || !candlesB.length) {
      return 0;
    }

    // Получаем массив разниц между ценами закрытия
    const spreadSeries = this.calculateSpread(candlesA, candlesB);

    // Рассчитываем среднее значение спреда
    const mean = this.calculateMean(spreadSeries);

    // Рассчитываем стандартное отклонение
    const stdDev = this.calculateStandardDeviation(spreadSeries, mean);

    // Избегаем деления на ноль
    if (stdDev === 0) {
      return 0;
    }

    // Берем последнее значение спреда для расчета текущего z-score
    const currentSpread = spreadSeries[spreadSeries.length - 1];

    // Формула z-score: (значение - среднее) / стандартное отклонение
    return (currentSpread - mean) / stdDev;
  }

  private calculateSpread(candlesA: TCandle[], candlesB: TCandle[]): number[] {
    // Определяем минимальную длину массивов
    const minLength = Math.min(candlesA.length, candlesB.length);
    const spreadSeries: number[] = [];

    // Рассчитываем разницу между ценами закрытия
    for (let i = 0; i < minLength; i++) {
      spreadSeries.push(Number(candlesA[i].close) - Number(candlesB[i].close));
    }

    return spreadSeries;
  }

  private calculateMean(values: number[]): number {
    if (!values.length) return 0;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    if (!values.length) return 0;

    const squaredDifferences = values.map((value) => Math.pow(value - mean, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / values.length;

    return Math.sqrt(variance);
  }

  private calculateZScoreHistory(
    candlesA: TCandle[],
    candlesB: TCandle[],
  ): { timestamp: number; value: number }[] {
    // Проверяем, что у нас есть данные для расчета
    if (!candlesA.length || !candlesB.length) {
      return [];
    }

    // Получаем массив разниц между ценами закрытия
    const spreadSeries = this.calculateSpread(candlesA, candlesB);

    const result: { timestamp: number; value: number }[] = [];

    // Для каждой точки в истории рассчитываем z-score
    for (let i = 0; i < spreadSeries.length; i++) {
      // Берем все данные до текущего момента для расчета
      const currentSpreadSeries = spreadSeries.slice(0, i + 1);

      // Рассчитываем среднее значение спреда
      const mean = this.calculateMean(currentSpreadSeries);

      // Рассчитываем стандартное отклонение
      const stdDev = this.calculateStandardDeviation(currentSpreadSeries, mean);

      // Избегаем деления на ноль
      if (stdDev === 0) {
        result.push({
          timestamp: Number(candlesA[i].openTime),
          value: 0,
        });
        continue;
      }

      // Текущее значение спреда
      const currentSpread = currentSpreadSeries[currentSpreadSeries.length - 1];

      // Формула z-score: (значение - среднее) / стандартное отклонение
      const zScore = (currentSpread - mean) / stdDev;

      result.push({
        timestamp: Number(candlesA[i].openTime),
        value: zScore,
      });
    }

    return result;
  }

  public calculateMultipleTimeframeZScore(
    candlesMapA: Record<TTimeframe, TCandle[]>,
    candlesMapB: Record<TTimeframe, TCandle[]>,
  ) {
    const result: Record<TTimeframe, number> = {} as Record<TTimeframe, number>;

    for (const timeframe of R.keys(candlesMapA)) {
      if (candlesMapB[timeframe]) {
        result[timeframe] = this.calculateZScore(candlesMapA[timeframe], candlesMapB[timeframe]);
      }
    }

    return result;
  }

  public calculateMultipleTimeframeZScoreHistory(
    candlesMapA: Record<TTimeframe, TCandle[]>,
    candlesMapB: Record<TTimeframe, TCandle[]>,
  ) {
    const result: Record<TTimeframe, { timestamp: number; value: number }[]> = {} as Record<
      TTimeframe,
      { timestamp: number; value: number }[]
    >;

    for (const timeframe of R.keys(candlesMapA)) {
      if (candlesMapB[timeframe]) {
        result[timeframe] = this.calculateZScoreHistory(
          candlesMapA[timeframe],
          candlesMapB[timeframe],
        );
      }
    }

    return result;
  }
}
