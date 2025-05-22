import * as R from 'remeda';

import { TCandle, TTimeframe } from '../../types';

export type CointegrationResult = {
  isCointegrated: boolean;
};

export class EngleGrangerTest {
  /**
   * Выполняет тест Энгла-Грейнджера для проверки коинтеграции между двумя временными рядами
   * @param pricesA Массив цен первого актива
   * @param pricesB Массив цен второго актива
   * @returns Результат теста коинтеграции
   */
  public testCointegration(pricesA: number[], pricesB: number[]): CointegrationResult {
    if (pricesA.length !== pricesB.length) {
      console.warn('Цены двух активов имеют разную длину');

      return {
        isCointegrated: false,
      };
    }

    if (pricesA.length < 30) {
      console.warn('Цены двух активов имеют меньше 30 наблюдений');

      return {
        isCointegrated: false,
      };
    }

    // Шаг 1: Оценка коинтеграционного соотношения (регрессия)
    const { slope: beta, intercept: alpha } = this.linearRegression(pricesA, pricesB);

    // Шаг 2: Вычисление остатков
    const residuals = pricesB.map((y, i) => y - (alpha + beta * pricesA[i]));

    // Шаг 3: Проверка стационарности остатков (тест Дики-Фуллера)
    const adfResult = this.augmentedDickeyFullerTest(residuals);

    // Критические значения для теста Дики-Фуллера (для коинтеграции)
    // Значения взяты из таблиц Энгла-Грейнджера для двух переменных
    const criticalValues = {
      '1%': -3.9,
      '5%': -3.34,
      '10%': -3.04,
    };

    // Если тестовая статистика меньше критического значения, отвергаем нулевую гипотезу
    // о наличии единичного корня, что означает стационарность остатков и наличие коинтеграции
    const isCointegrated = adfResult.testStatistic < criticalValues['5%'];

    return {
      isCointegrated,
    };
  }

  /**
   * Выполняет расширенный тест Дики-Фуллера для проверки стационарности временного ряда
   * @param series Временной ряд
   * @param lags Количество лагов для теста (по умолчанию определяется автоматически)
   * @returns Результат теста
   */
  private augmentedDickeyFullerTest(
    series: number[],
    lags?: number,
  ): { testStatistic: number; pValue: number } {
    // Автоматическое определение количества лагов, если не указано
    if (lags === undefined) {
      // Формула для определения оптимального количества лагов: (T^(1/3))
      lags = Math.floor(Math.pow(series.length, 1 / 3));
    }

    // Создаем разности ряда
    const diff = series.slice(1).map((val, i) => val - series[i]);

    // Создаем лаги разностей
    const laggedDiffs: number[][] = [];
    for (let lag = 1; lag <= lags; lag++) {
      const laggedDiff = [];
      for (let i = lag; i < diff.length; i++) {
        laggedDiff.push(diff[i - lag]);
      }
      laggedDiffs.push(laggedDiff);
    }

    // Подготавливаем данные для регрессии
    const y = diff.slice(lags); // Зависимая переменная
    const x1 = series.slice(lags, series.length - 1); // Лагированный уровень

    // Выполняем регрессию y = beta * x1 + sum(gamma_i * laggedDiffs_i)
    // Для простоты используем только коэффициент beta для теста
    // В полной реализации нужно использовать множественную регрессию

    // Упрощенная реализация: используем только лагированный уровень
    const n = y.length;
    const meanX = R.mean(x1)!;
    const meanY = R.mean(y)!;

    const numerator = x1.reduce((sum, x, i) => sum + (x - meanX) * (y[i] - meanY), 0);
    const denominator = x1.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0);

    const beta = numerator / denominator;
    const residuals = y.map((val, i) => val - beta * x1[i]);

    // Стандартная ошибка коэффициента
    const SSR = residuals.reduce((sum, r) => sum + r * r, 0);
    const variance = SSR / (n - 2);
    const standardError = Math.sqrt(variance / denominator);

    // t-статистика
    const testStatistic = beta / standardError;

    // Приблизительное p-значение (в реальности нужно использовать таблицы)
    // Это очень грубое приближение
    const pValue = this.approximatePValue(testStatistic);

    return { testStatistic, pValue };
  }

  /**
   * Выполняет линейную регрессию y = a + b*x
   * @param x Массив независимых переменных
   * @param y Массив зависимых переменных
   * @returns Объект с коэффициентами наклона (slope) и пересечения (intercept)
   */
  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
    const n = x.length;
    const meanX = R.mean(x)!;
    const meanY = R.mean(y)!;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += Math.pow(x[i] - meanX, 2);
    }

    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;

    return { slope, intercept };
  }

  /**
   * Грубое приближение p-значения для теста Дики-Фуллера
   * В реальной реализации следует использовать таблицы или более точные методы
   */
  private approximatePValue(testStatistic: number): number {
    // Очень упрощенное приближение
    return Math.exp(testStatistic) / (1 + Math.exp(testStatistic));
  }

  /**
   * Рассчитывает коинтеграцию для нескольких таймфреймов
   */
  public calculateMultipleTimeframeCointegration(
    timeframeCandlesMapA: Record<TTimeframe, TCandle[]>,
    timeframeCandlesMapB: Record<TTimeframe, TCandle[]>,
  ): Record<TTimeframe, CointegrationResult> {
    return R.mapValues(timeframeCandlesMapA, (candlesA, timeframe) => {
      const candlesB = timeframeCandlesMapB[timeframe as TTimeframe];

      // Извлекаем цены закрытия
      const pricesA = candlesA.map((candle) => parseFloat(candle.close));
      const pricesB = candlesB.map((candle) => parseFloat(candle.close));

      return this.testCointegration(pricesA, pricesB);
    });
  }
}
