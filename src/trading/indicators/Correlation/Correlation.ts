import * as R from 'remeda';

import { TPriceLevelsTimeframe, TKline, TTimeframe } from '../../types';

export class Correlation {
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;

    // Проверка на достаточное количество данных
    if (n < 2) return 0;

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
    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  public calculateCorrelation(
    klinesMapA: Record<TPriceLevelsTimeframe, TKline[]>,
    klinesMapB: Record<TPriceLevelsTimeframe, TKline[]>,
  ) {
    const correlations: Record<TPriceLevelsTimeframe, number> = {} as Record<
      TPriceLevelsTimeframe,
      number
    >;

    // Рассчитываем корреляцию для каждого таймфрейма
    for (const timeframe of R.keys(klinesMapA)) {
      const klinesA = klinesMapA[timeframe];
      const klinesB = klinesMapB[timeframe];

      // Проверяем, что у нас есть данные для обоих активов
      if (!klinesA.length || !klinesB.length) {
        correlations[timeframe] = 0;
        continue;
      }

      // Используем только общие временные точки
      const minLength = Math.min(klinesA.length, klinesB.length);

      // Извлекаем цены закрытия для расчета корреляции
      const pricesA = klinesA.slice(0, minLength).map((kline) => parseFloat(kline.close));
      const pricesB = klinesB.slice(0, minLength).map((kline) => parseFloat(kline.close));

      // Рассчитываем корреляцию Пирсона
      correlations[timeframe] = this.pearsonCorrelation(pricesA, pricesB);
    }

    // Рассчитываем общую корреляцию как среднее взвешенное значение
    // Более короткие таймфреймы имеют меньший вес, более длинные - больший
    const weights: Record<TTimeframe, number> = {
      '1s': 1,
      '1m': 7,
      '3m': 8,
      '5m': 9,
      '15m': 10,
      '30m': 11,
      '1h': 12,
      '2h': 13,
      '4h': 14,
      '6h': 15,
      '8h': 16,
      '12h': 17,
      '1d': 18,
      '1w': 19,
      '1M': 20,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const timeframe of R.keys(correlations)) {
      const weight = weights[timeframe] || 1;
      weightedSum += correlations[timeframe] * weight;
      totalWeight += weight;
    }

    const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      timeframes: correlations,
      overall,
    };
  }
}
