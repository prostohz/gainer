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

    if (isNaN(numerator) || isNaN(denominator)) {
      return 0;
    }

    // Избегаем деления на ноль
    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  public correlationByPrices(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]): number {
    if (!candlesA.length || !candlesB.length) {
      return 0;
    }

    const minLength = Math.min(candlesA.length, candlesB.length);

    // Извлекаем цены закрытия для расчета корреляции
    const pricesA = candlesA.slice(0, minLength).map((candle) => candle.close);
    const pricesB = candlesB.slice(0, minLength).map((candle) => candle.close);

    return this.calculate(pricesA, pricesB);
  }

  public rollingCorrelationByPrices(
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
        value: this.correlationByPrices(seriesA, seriesB),
      });
    }

    return result;
  }

  /**
   * Вычисляет логарифмические доходности по массиву свечей
   */
  private getLogReturns(candles: TIndicatorCandle[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1].close;
      const curr = candles[i].close;
      // Защита от деления на 0 и отрицательных цен
      if (prev > 0 && curr > 0) {
        returns.push(Math.log(curr / prev));
      } else {
        returns.push(0);
      }
    }
    return returns;
  }

  /**
   * Корреляция по доходностям
   */
  public correlationByReturns(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]): number {
    if (candlesA.length < 2 || candlesB.length < 2) {
      return 0;
    }

    const minLength = Math.min(candlesA.length, candlesB.length);

    // Синхронизируем длину
    const returnsA = this.getLogReturns(candlesA.slice(0, minLength));
    const returnsB = this.getLogReturns(candlesB.slice(0, minLength));

    // returnsA и returnsB на 1 короче, поэтому подравниваем
    const finalLength = Math.min(returnsA.length, returnsB.length);

    return this.calculate(returnsA.slice(0, finalLength), returnsB.slice(0, finalLength));
  }

  /**
   * Скользящая корреляция по доходностям
   */
  public rollingCorrelationByReturns(
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
      const windowA = returnsA.slice(i - window, i);
      const windowB = returnsB.slice(i - window, i);

      result.push({
        timestamp: Number(candlesA[i + 1].openTime), // +1, т.к. returns на 1 меньше
        value: this.calculate(windowA, windowB),
      });
    }
    return result;
  }
}
