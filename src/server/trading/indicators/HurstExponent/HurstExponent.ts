export class HurstExponent {
  /**
   * Вычисляет экспоненту Херста для временного ряда
   * H = 0.5 - случайное блуждание (нет памяти)
   * H > 0.5 - персистентный ряд (тренд)
   * H < 0.5 - антиперсистентный ряд (возврат к среднему)
   *
   * @param pricesA - массив ценовых данных актива 1
   * @param pricesB - массив ценовых данных актива 2
   * @param minPeriod - минимальный период для анализа (по умолчанию 10)
   * @param maxPeriod - максимальный период для анализа (по умолчанию длина данных / 4)
   * @param useLogPrices - флаг использования логарифмов цен (по умолчанию true)
   * @param applyDifferencing - флаг применения первых разностей спреда (по умолчанию true)
   * @returns экспонента Херста
   */
  public calculate(
    pricesA: number[],
    pricesB: number[],
    minPeriod: number = 10,
    maxPeriod?: number,
    useLogPrices: boolean = true,
    applyDifferencing: boolean = true,
  ) {
    if (pricesA.length !== pricesB.length) {
      console.warn(
        'HurstExponent: price arrays must have the same length:',
        pricesA.length,
        pricesB.length,
      );

      return null;
    }

    // При необходимости конвертируем в логарифмы, чтобы нивелировать экспоненциальный рост цен
    const series1 = useLogPrices ? pricesA.map((v) => Math.log(v)) : pricesA;
    const series2 = useLogPrices ? pricesB.map((v) => Math.log(v)) : pricesB;

    // Находим коэффициенты коинтеграционной регрессии: series2 = alpha + beta * series1
    const regression = this.linearRegression(series1, series2);
    if (!regression) {
      console.warn('HurstExponent: failed to calculate linear regression:', series1, series2);

      return null;
    }

    const { slope: beta, intercept: alpha } = regression;

    // Спред = остатки регрессии (series2 - (alpha + beta * series1))
    let data = series2.map((value, i) => value - (alpha + beta * series1[i]));

    // По желанию используем первые разности спреда (returns), что уменьшает трендовость
    if (applyDifferencing) {
      data = data.slice(1).map((v, i) => v - data[i]);
    }

    if (data.length < 20) {
      console.warn('HurstExponent: not enough data for Hurst exponent calculation:', data.length);

      return null;
    }

    maxPeriod = maxPeriod || Math.floor(data.length / 4);

    if (minPeriod >= maxPeriod) {
      console.warn('HurstExponent: minPeriod must be less than maxPeriod:', minPeriod, maxPeriod);

      return null;
    }

    const logPeriods: number[] = [];
    const logRS: number[] = [];

    // Перебираем различные периоды для анализа
    for (let period = minPeriod; period <= maxPeriod; period++) {
      const rs = this.calculateRescaledRange(data, period);
      if (rs === null) {
        console.warn('HurstExponent: failed to calculate rescaled range:', data, period);

        return null;
      }

      if (rs > 0) {
        logPeriods.push(Math.log(period));
        logRS.push(Math.log(rs));
      }
    }

    if (logPeriods.length < 3) {
      console.warn(
        'HurstExponent: not enough points for Hurst exponent calculation:',
        logPeriods.length,
      );

      return 0;
    }

    // Вычисляем наклон линейной регрессии (это и есть экспонента Херста)
    const lr = this.linearRegression(logPeriods, logRS);
    if (!lr) {
      console.warn('HurstExponent: failed to calculate linear regression:', logPeriods, logRS);

      return null;
    }

    return lr.slope;
  }

  /**
   * Вычисляет среднее значение R/S для заданного периода
   * @param data - временной ряд
   * @param period - период для анализа
   * @returns среднее значение rescaled range
   */
  private calculateRescaledRange(data: number[], period: number) {
    const segments = Math.floor(data.length / period);
    if (segments < 1) {
      console.warn('HurstExponent: segments less than 1:', segments);

      return null;
    }

    let totalRS = 0;
    let validSegments = 0;

    // Разбиваем данные на сегменты и вычисляем R/S для каждого
    for (let i = 0; i < segments; i++) {
      const segmentStart = i * period;
      const segmentEnd = segmentStart + period;
      const segment = data.slice(segmentStart, segmentEnd);

      const rs = this.calculateRSForSegment(segment);
      if (rs === null) {
        console.warn('HurstExponent: failed to calculate RS for segment:', segment);

        return null;
      }

      if (rs > 0) {
        totalRS += rs;
        validSegments++;
      }
    }

    return validSegments > 0 ? totalRS / validSegments : 0;
  }

  /**
   * Вычисляет R/S для одного сегмента данных
   * @param segment - сегмент временного ряда
   * @returns rescaled range для сегмента
   */
  private calculateRSForSegment(segment: number[]) {
    if (segment.length < 2) {
      console.warn('HurstExponent: segment has less than 2 observations:', segment.length);

      return null;
    }

    // Вычисляем среднее значение
    const mean = segment.reduce((sum, val) => sum + val, 0) / segment.length;

    // Вычисляем накопленные отклонения от среднего
    const cumulativeDeviations: number[] = [];
    let cumSum = 0;

    for (const value of segment) {
      cumSum += value - mean;
      cumulativeDeviations.push(cumSum);
    }

    // Находим диапазон (Range)
    const maxCumDev = Math.max(...cumulativeDeviations);
    const minCumDev = Math.min(...cumulativeDeviations);
    const range = maxCumDev - minCumDev;

    // Вычисляем стандартное отклонение (Scale)
    const variance =
      segment.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / segment.length;
    const standardDeviation = Math.sqrt(variance);

    // Возвращаем R/S (избегаем деления на ноль)
    return standardDeviation > 0 ? range / standardDeviation : 0;
  }

  /**
   * Выполняет линейную регрессию методом наименьших квадратов
   * @param x - массив x значений
   * @param y - массив y значений
   * @returns объект с наклоном и пересечением
   */
  private linearRegression(x: number[], y: number[]) {
    if (x.length !== y.length || x.length === 0) {
      console.warn(
        'HurstExponent: x and y arrays must have the same non-zero length:',
        x.length,
        y.length,
      );

      return null;
    }

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }
}
