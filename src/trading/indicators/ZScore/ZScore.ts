import * as R from 'remeda';

import { TTimeframe } from '../../types';
import { TKline } from '../../types';

export class ZScore {
  public calculateZScore(klinesA: TKline[], klinesB: TKline[]): number {
    // Проверяем, что у нас есть данные для расчета
    if (!klinesA.length || !klinesB.length) {
      return 0;
    }

    // Получаем массив разниц между ценами закрытия
    const spreadSeries = this.calculateSpread(klinesA, klinesB);

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

  private calculateSpread(klinesA: TKline[], klinesB: TKline[]): number[] {
    // Определяем минимальную длину массивов
    const minLength = Math.min(klinesA.length, klinesB.length);
    const spreadSeries: number[] = [];

    // Рассчитываем разницу между ценами закрытия
    for (let i = 0; i < minLength; i++) {
      spreadSeries.push(Number(klinesA[i].close) - Number(klinesB[i].close));
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
    klinesA: TKline[],
    klinesB: TKline[],
  ): { timestamp: number; value: number }[] {
    // Проверяем, что у нас есть данные для расчета
    if (!klinesA.length || !klinesB.length) {
      return [];
    }

    // Получаем массив разниц между ценами закрытия
    const spreadSeries = this.calculateSpread(klinesA, klinesB);

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
          timestamp: Number(klinesA[i].openTime),
          value: 0,
        });
        continue;
      }

      // Текущее значение спреда
      const currentSpread = currentSpreadSeries[currentSpreadSeries.length - 1];

      // Формула z-score: (значение - среднее) / стандартное отклонение
      const zScore = (currentSpread - mean) / stdDev;

      result.push({
        timestamp: Number(klinesA[i].openTime),
        value: zScore,
      });
    }

    return result;
  }

  public calculateMultipleTimeframeZScore(
    klinesMapA: Record<TTimeframe, TKline[]>,
    klinesMapB: Record<TTimeframe, TKline[]>,
  ) {
    const result: Record<TTimeframe, number> = {} as Record<TTimeframe, number>;

    for (const timeframe of R.keys(klinesMapA)) {
      if (klinesMapB[timeframe]) {
        result[timeframe] = this.calculateZScore(klinesMapA[timeframe], klinesMapB[timeframe]);
      }
    }

    return result;
  }

  public calculateMultipleTimeframeZScoreHistory(
    klinesMapA: Record<TTimeframe, TKline[]>,
    klinesMapB: Record<TTimeframe, TKline[]>,
  ) {
    const result: Record<TTimeframe, { timestamp: number; value: number }[]> = {} as Record<
      TTimeframe,
      { timestamp: number; value: number }[]
    >;

    for (const timeframe of R.keys(klinesMapA)) {
      if (klinesMapB[timeframe]) {
        result[timeframe] = this.calculateZScoreHistory(
          klinesMapA[timeframe],
          klinesMapB[timeframe],
        );
      }
    }

    return result;
  }
}
