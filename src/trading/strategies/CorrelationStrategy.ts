import { PearsonCorrelation } from '../indicators/PearsonCorrelation/PearsonCorrelation';
import { TTimeframe, TKline } from '../types';

export class CorrelationStrategy {
  private correlation: PearsonCorrelation;
  private zScoreThreshold: number = 2.0; // Порог для входа в позицию
  private lookbackPeriod: number = 20; // Период для расчета среднего и стандартного отклонения

  constructor() {
    this.correlation = new PearsonCorrelation();
  }

  // Рассчитывает Z-score для спреда между двумя активами
  private calculateZScore(spreadHistory: number[], currentSpread: number): number {
    const recentSpreads = spreadHistory.slice(-this.lookbackPeriod);

    // Рассчитываем среднее значение спреда
    const mean = recentSpreads.reduce((sum, val) => sum + val, 0) / recentSpreads.length;

    // Рассчитываем стандартное отклонение
    const variance =
      recentSpreads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentSpreads.length;
    const stdDev = Math.sqrt(variance);

    // Избегаем деления на ноль
    if (stdDev === 0) return 0;

    // Рассчитываем Z-score
    return (currentSpread - mean) / stdDev;
  }

  // Основная функция для определения торговых сигналов
  public generateSignals(
    klinesMapA: Record<TTimeframe, TKline[]>,
    klinesMapB: Record<TTimeframe, TKline[]>,
    timeframe: TTimeframe,
  ): { action: 'BUY_A_SELL_B' | 'BUY_B_SELL_A' | 'CLOSE' | 'NONE'; zScore: number } {
    // Проверяем корреляцию
    const correlationResult = this.correlation.calculateMultipleTimeframeCorrelation(
      klinesMapA,
      klinesMapB,
    );
    const timeframeCorrelation = correlationResult.timeframes[timeframe];

    // Если корреляция недостаточно высокая, не торгуем
    if (Math.abs(timeframeCorrelation) < 0.7) {
      return { action: 'NONE', zScore: 0 };
    }

    const klinesA = klinesMapA[timeframe];
    const klinesB = klinesMapB[timeframe];

    // Получаем цены закрытия
    const pricesA = klinesA.map((kline) => parseFloat(kline.close));
    const pricesB = klinesB.map((kline) => parseFloat(kline.close));

    // Нормализуем цены к начальному значению для сравнения
    const normalizedA = pricesA.map((price) => price / pricesA[0]);
    const normalizedB = pricesB.map((price) => price / pricesB[0]);

    // Рассчитываем спред между нормализованными ценами
    const spreads = normalizedA.map((valA, i) => valA - normalizedB[i]);

    // Текущий спред
    const currentSpread = spreads[spreads.length - 1];

    // Рассчитываем Z-score
    const zScore = this.calculateZScore(spreads.slice(0, -1), currentSpread);

    // Генерируем сигналы на основе Z-score
    if (zScore > this.zScoreThreshold) {
      // Актив A переоценен относительно B
      return { action: 'BUY_B_SELL_A', zScore };
    } else if (zScore < -this.zScoreThreshold) {
      // Актив B переоценен относительно A
      return { action: 'BUY_A_SELL_B', zScore };
    } else if (Math.abs(zScore) < 0.5) {
      // Спред вернулся к среднему значению, закрываем позиции
      return { action: 'CLOSE', zScore };
    }

    return { action: 'NONE', zScore };
  }
}
