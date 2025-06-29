import { TIndicatorShortCandle } from '../types';
import { KalmanFilter } from './KalmanFilter';

export class BetaHedge {
  /**
   * Вычисляет доходности из массива цен
   */
  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const return_ = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(return_);
    }
    return returns;
  }

  /**
   * Расчет beta с использованием фильтра Кальмана
   */
  public calculateBeta(candlesA: TIndicatorShortCandle[], candlesB: TIndicatorShortCandle[]) {
    const minLength = Math.min(candlesA.length, candlesB.length);
    if (minLength < 2) {
      console.warn(
        'BetaHedge: prices series have less than 2 observations:',
        candlesA.length,
        candlesB.length,
      );

      return null;
    }

    const pricesA = candlesA.slice(-minLength).map((candle) => candle.close);
    const pricesB = candlesB.slice(-minLength).map((candle) => candle.close);

    // Вычисляем доходности
    const returnsA = this.calculateReturns(pricesA);
    const returnsB = this.calculateReturns(pricesB);

    if (returnsA.length === 0 || returnsB.length === 0) {
      console.warn('BetaHedge: insufficient data for returns calculation');
      return null;
    }

    // Инициализируем фильтр Кальмана
    const kalmanFilter = new KalmanFilter(
      1.0, // initial beta estimate
      1.0, // initial covariance
      1e-5, // process noise (как быстро beta может изменяться)
      1e-3, // measurement noise
    );

    // Пропускаем доходности через фильтр Кальмана
    let lastBeta = 1.0;
    for (let i = 0; i < Math.min(returnsA.length, returnsB.length); i++) {
      const returnA = returnsA[i];
      const returnB = returnsB[i];

      // Избегаем деления на ноль или очень малые значения
      if (Math.abs(returnA) > 1e-8) {
        lastBeta = kalmanFilter.update(returnB, returnA);
      }
    }

    return lastBeta;
  }

  public rollingBeta(
    candlesA: TIndicatorShortCandle[],
    candlesB: TIndicatorShortCandle[],
    window: number = 100,
  ) {
    const minLength = Math.min(candlesA.length, candlesB.length);

    if (minLength < window + 1) {
      return [];
    }

    const pA = candlesA.slice(-minLength);
    const pB = candlesB.slice(-minLength);

    // Получаем цены и вычисляем доходности
    const pricesA = pA.map((candle) => candle.close);
    const pricesB = pB.map((candle) => candle.close);
    const returnsA = this.calculateReturns(pricesA);
    const returnsB = this.calculateReturns(pricesB);

    const result: { timestamp: number; value: number | null }[] = [];

    // Для каждого окна создаем новый фильтр Кальмана
    for (let i = window; i < pA.length && i < pB.length && i < returnsA.length + 1; i++) {
      const kalmanFilter = new KalmanFilter(
        1.0, // initial beta estimate
        1.0, // initial covariance
        1e-4, // немного больший process noise для адаптивности
        1e-3, // measurement noise
      );

      // Применяем фильтр к окну данных
      let lastBeta = 1.0;
      const startIdx = Math.max(0, i - window);
      const endIdx = Math.min(returnsA.length, i);

      for (let j = startIdx; j < endIdx; j++) {
        const returnA = returnsA[j];
        const returnB = returnsB[j];

        // Избегаем деления на ноль или очень малые значения
        if (Math.abs(returnA) > 1e-8) {
          lastBeta = kalmanFilter.update(returnB, returnA);
        }
      }

      result.push({
        timestamp: Number(pA[i].openTime),
        value: lastBeta,
      });
    }

    return result;
  }
}
