import * as R from 'remeda';

import { TTimeframe, TKline } from '../../types';

export class PearsonCorrelation {
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

  public calculateSingleTimeframeCorrelation(klinesA: TKline[], klinesB: TKline[]): number {
    if (!klinesA.length || !klinesB.length) {
      return 0;
    }

    const minLength = Math.min(klinesA.length, klinesB.length);

    // Извлекаем цены закрытия для расчета корреляции
    const pricesA = klinesA.slice(0, minLength).map((kline) => parseFloat(kline.close));
    const pricesB = klinesB.slice(0, minLength).map((kline) => parseFloat(kline.close));

    return this.pearsonCorrelation(pricesA, pricesB);
  }

  public calculateMultipleTimeframeCorrelation(
    klinesMapA: Record<TTimeframe, TKline[]>,
    klinesMapB: Record<TTimeframe, TKline[]>,
  ) {
    const correlations: Record<TTimeframe, number> = {} as Record<TTimeframe, number>;

    // Рассчитываем корреляцию для каждого таймфрейма
    for (const timeframe of R.keys(klinesMapA)) {
      correlations[timeframe] = this.calculateSingleTimeframeCorrelation(
        klinesMapA[timeframe],
        klinesMapB[timeframe],
      );
    }

    return correlations;
  }
}
