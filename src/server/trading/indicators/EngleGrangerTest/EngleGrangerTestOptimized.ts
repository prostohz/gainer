import { Matrix, inverse } from 'ml-matrix';

import { TIndicatorShortCandle } from '../types';

export type TCointegrationResult = {
  pValue: number;
};

export class EngleGrangerTestOptimized {
  // Критические значения Энгла-Грейнджера для коинтеграции (2 переменные)
  private readonly CRITICAL_VALUES: Record<number, { '1%': number; '5%': number; '10%': number }> =
    {
      100: { '1%': -4.07, '5%': -3.37, '10%': -3.07 },
      200: { '1%': -4.0, '5%': -3.34, '10%': -3.04 },
      500: { '1%': -3.96, '5%': -3.32, '10%': -3.02 },
      1000: { '1%': -3.93, '5%': -3.3, '10%': -3.01 },
    };

  private readonly MIN_OBSERVATIONS = 100;

  /**
   * Валидация входных данных - оптимизированная версия
   */
  private validateData(data: number[]): { isValid: boolean; error?: string } {
    const length = data.length;
    if (length === 0) {
      return { isValid: false, error: 'Empty data array' };
    }

    // Одним проходом проверяем и валидность, и константность
    const firstValue = data[0];
    if (!isFinite(firstValue)) {
      return { isValid: false, error: `Invalid value at index 0: ${firstValue}` };
    }

    let isConstant = true;
    for (let i = 1; i < length; i++) {
      const value = data[i];
      if (!isFinite(value)) {
        return { isValid: false, error: `Invalid value at index ${i}: ${value}` };
      }
      if (isConstant && value !== firstValue) {
        isConstant = false;
      }
    }

    if (isConstant) {
      return { isValid: false, error: 'Data series is constant' };
    }

    return { isValid: true };
  }

  /**
   * Получение критических значений для заданного размера выборки
   */
  private getCriticalValues(sampleSize: number) {
    const sizes = Object.keys(this.CRITICAL_VALUES)
      .map(Number)
      .sort((a, b) => a - b);

    // Если выборка меньше минимального размера
    if (sampleSize < sizes[0]) {
      return this.CRITICAL_VALUES[sizes[0]];
    }

    // Если выборка больше максимального размера
    if (sampleSize > sizes[sizes.length - 1]) {
      return this.CRITICAL_VALUES[sizes[sizes.length - 1]];
    }

    // Поиск подходящего размера или интерполяция
    for (let i = 0; i < sizes.length - 1; i++) {
      if (sampleSize >= sizes[i] && sampleSize <= sizes[i + 1]) {
        if (sampleSize === sizes[i]) return this.CRITICAL_VALUES[sizes[i]];
        if (sampleSize === sizes[i + 1]) return this.CRITICAL_VALUES[sizes[i + 1]];

        // Линейная интерполяция
        const t = (sampleSize - sizes[i]) / (sizes[i + 1] - sizes[i]);
        const lower = this.CRITICAL_VALUES[sizes[i]];
        const upper = this.CRITICAL_VALUES[sizes[i + 1]];

        return {
          '1%': lower['1%'] + t * (upper['1%'] - lower['1%']),
          '5%': lower['5%'] + t * (upper['5%'] - lower['5%']),
          '10%': lower['10%'] + t * (upper['10%'] - lower['10%']),
        };
      }
    }

    return this.CRITICAL_VALUES[sizes[0]];
  }

  /**
   * Расширенный тест Дики-Фуллера с правильной множественной регрессией - оптимизированная версия
   */
  private augmentedDickeyFullerTest(series: number[], lags?: number) {
    // Автоматическое определение количества лагов
    if (lags === undefined) {
      lags = Math.max(1, Math.floor(Math.pow(series.length, 1 / 3)));
    }

    // Подготовка данных
    const n = series.length;

    // Нужно минимум lags+2 наблюдений для регрессии
    const startIndex = lags + 1;
    if (n - startIndex < 10) {
      throw new Error('Insufficient data for ADF test');
    }

    // Создаем матрицу X и вектор y для регрессии
    const numObs = n - startIndex;
    const numCols = lags + 2; // константа + лагированный уровень + лаги разностей

    const X = new Matrix(numObs, numCols);
    const y = new Matrix(numObs, 1);

    for (let i = 0; i < numObs; i++) {
      const timeIndex = startIndex + i;

      // Зависимая переменная: разность (вычисляем напрямую без создания массива)
      const diff = series[timeIndex] - series[timeIndex - 1];
      y.set(i, 0, diff);

      // Независимые переменные:
      // 1. Константа
      X.set(i, 0, 1);

      // 2. Лагированный уровень
      X.set(i, 1, series[timeIndex - 1]);

      // 3. Лаги разностей (вычисляем напрямую без создания массива)
      for (let lag = 1; lag <= lags; lag++) {
        const laggedDiff = series[timeIndex - lag] - series[timeIndex - lag - 1];
        X.set(i, lag + 1, laggedDiff);
      }
    }

    try {
      // Решаем систему: β = (X'X)^(-1)X'y
      const XTranspose = X.transpose();
      const XTX = XTranspose.mmul(X);
      const XTXInverse = inverse(XTX);
      const XTy = XTranspose.mmul(y);
      const beta = XTXInverse.mmul(XTy);

      // Вычисляем остатки
      const yPred = X.mmul(beta);
      const residuals = y.clone().sub(yPred);

      // Вычисляем стандартную ошибку для коэффициента при лагированном уровне
      const SSR = residuals.transpose().mmul(residuals).get(0, 0);
      const variance = SSR / (numObs - numCols);
      const covMatrix = XTXInverse.mul(variance);
      const standardError = Math.sqrt(covMatrix.get(1, 1)); // SE для коэффициента при лагированном уровне

      // t-статистика для коэффициента при лагированном уровне
      const testStatistic = beta.get(1, 0) / standardError;

      // Приближенное p-значение
      const pValue = this.calculatePValue(testStatistic, numObs);

      return { pValue };
    } catch (error) {
      console.error('Error in ADF test:', error);
      return { pValue: 1 };
    }
  }

  /**
   * Вычисление приближенного p-значения для ADF теста
   */
  private calculatePValue(testStatistic: number, sampleSize: number): number {
    const criticalValues = this.getCriticalValues(sampleSize);

    // Приближенное вычисление p-значения через интерполяцию
    if (testStatistic < criticalValues['1%']) {
      return 0.01;
    } else if (testStatistic < criticalValues['5%']) {
      // Интерполяция между 1% и 5%
      const t =
        (testStatistic - criticalValues['1%']) / (criticalValues['5%'] - criticalValues['1%']);
      return 0.01 + t * 0.04;
    } else if (testStatistic < criticalValues['10%']) {
      // Интерполяция между 5% и 10%
      const t =
        (testStatistic - criticalValues['5%']) / (criticalValues['10%'] - criticalValues['5%']);
      return 0.05 + t * 0.05;
    } else {
      // Приближение для больших значений
      return Math.min(0.99, 0.1 + (testStatistic - criticalValues['10%']) * 0.1);
    }
  }

  /**
   * Выполняет тест Энгла-Грейнджера для проверки коинтеграции между двумя временными рядами - оптимизированная версия
   */
  private testCointegration(pricesA: number[], pricesB: number[]): TCointegrationResult {
    // Шаг 1: Оценка коинтеграционного соотношения (регрессия)
    const { slope: beta, intercept: alpha } = this.linearRegression(pricesA, pricesB);

    // Шаг 2: Вычисление остатков (создаем массив напрямую без промежуточных операций)
    const residuals = new Array(pricesB.length);
    for (let i = 0; i < pricesB.length; i++) {
      residuals[i] = pricesB[i] - (alpha + beta * pricesA[i]);
    }

    // Шаг 3: Проверка стационарности остатков (тест Дики-Фуллера)
    const adfResult = this.augmentedDickeyFullerTest(residuals);

    return {
      pValue: adfResult.pValue,
    };
  }

  /**
   * Выполняет линейную регрессию y = a + b*x - оптимизированная версия
   */
  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
    const n = x.length;

    // Вычисляем суммы одним проходом
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumX2 += xi * xi;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    // Используем более эффективную формулу для наклона
    const slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX);
    const intercept = meanY - slope * meanX;

    return { slope, intercept };
  }

  /**
   * Рассчитывает коинтеграцию для двух временных рядов свечей - оптимизированная версия
   */
  public calculateCointegration(
    candlesA: TIndicatorShortCandle[],
    candlesB: TIndicatorShortCandle[],
  ): TCointegrationResult | null {
    const minLength = Math.min(candlesA.length, candlesB.length);

    if (minLength < this.MIN_OBSERVATIONS) {
      console.warn(
        `EngleGrangerTest: Insufficient data. Need at least ${this.MIN_OBSERVATIONS} observations, got ${minLength}`,
      );
      return null;
    }

    // Извлекаем цены напрямую без промежуточных массивов
    const pricesA = new Array(minLength);
    const pricesB = new Array(minLength);

    const startIndexA = candlesA.length - minLength;
    const startIndexB = candlesB.length - minLength;

    for (let i = 0; i < minLength; i++) {
      pricesA[i] = candlesA[startIndexA + i].close;
      pricesB[i] = candlesB[startIndexB + i].close;
    }

    // Валидация данных
    const validationA = this.validateData(pricesA);
    const validationB = this.validateData(pricesB);

    if (!validationA.isValid) {
      console.error('EngleGrangerTest: Invalid data in series A:', validationA.error);
      return null;
    }

    if (!validationB.isValid) {
      console.error('EngleGrangerTest: Invalid data in series B:', validationB.error);
      return null;
    }

    try {
      return this.testCointegration(pricesA, pricesB);
    } catch (error) {
      console.error('EngleGrangerTest: Error in cointegration test:', error);
      return null;
    }
  }
}
