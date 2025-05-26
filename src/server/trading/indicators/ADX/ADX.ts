import { TIndicatorCandle } from '../types';

export class ADX {
  private readonly period: number;

  constructor(period: number = 14) {
    this.period = period;
  }

  /**
   * Рассчитывает True Range (TR)
   */
  private calculateTrueRange(candles: TIndicatorCandle[]): number[] {
    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);

      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    return trueRanges;
  }

  /**
   * Рассчитывает Directional Movement (DM+ и DM-)
   */
  private calculateDirectionalMovement(candles: TIndicatorCandle[]): {
    dmPlus: number[];
    dmMinus: number[];
  } {
    const dmPlus: number[] = [];
    const dmMinus: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      const upMove = current.high - previous.high;
      const downMove = previous.low - current.low;

      if (upMove > downMove && upMove > 0) {
        dmPlus.push(upMove);
        dmMinus.push(0);
      } else if (downMove > upMove && downMove > 0) {
        dmPlus.push(0);
        dmMinus.push(downMove);
      } else {
        dmPlus.push(0);
        dmMinus.push(0);
      }
    }

    return { dmPlus, dmMinus };
  }

  /**
   * Рассчитывает сглаженное среднее (Wilder's smoothing)
   */
  private calculateWildersSmoothing(values: number[], period: number): number[] {
    const smoothed: number[] = [];

    if (values.length < period) {
      return smoothed;
    }

    // Первое значение - простое среднее
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    smoothed.push(sum / period);

    // Последующие значения - сглаженное среднее Уайлдера
    for (let i = period; i < values.length; i++) {
      const prevSmoothed = smoothed[smoothed.length - 1];
      const newSmoothed = (prevSmoothed * (period - 1) + values[i]) / period;
      smoothed.push(newSmoothed);
    }

    return smoothed;
  }

  /**
   * Рассчитывает Directional Indicators (DI+ и DI-)
   */
  private calculateDirectionalIndicators(
    dmPlus: number[],
    dmMinus: number[],
    trueRanges: number[],
  ): { diPlus: number[]; diMinus: number[] } {
    const smoothedDMPlus = this.calculateWildersSmoothing(dmPlus, this.period);
    const smoothedDMMinus = this.calculateWildersSmoothing(dmMinus, this.period);
    const smoothedTR = this.calculateWildersSmoothing(trueRanges, this.period);

    const diPlus: number[] = [];
    const diMinus: number[] = [];

    for (let i = 0; i < smoothedDMPlus.length; i++) {
      if (smoothedTR[i] !== 0) {
        diPlus.push((smoothedDMPlus[i] / smoothedTR[i]) * 100);
        diMinus.push((smoothedDMMinus[i] / smoothedTR[i]) * 100);
      } else {
        diPlus.push(0);
        diMinus.push(0);
      }
    }

    return { diPlus, diMinus };
  }

  /**
   * Рассчитывает DX (Directional Index)
   */
  private calculateDX(diPlus: number[], diMinus: number[]): number[] {
    const dx: number[] = [];

    for (let i = 0; i < diPlus.length; i++) {
      const sum = diPlus[i] + diMinus[i];
      if (sum !== 0) {
        const diff = Math.abs(diPlus[i] - diMinus[i]);
        dx.push((diff / sum) * 100);
      } else {
        dx.push(0);
      }
    }

    return dx;
  }

  /**
   * Рассчитывает ADX
   */
  public calculateADX(candles: TIndicatorCandle[]): number | null {
    if (candles.length < this.period * 2) {
      return null;
    }

    const trueRanges = this.calculateTrueRange(candles);
    const { dmPlus, dmMinus } = this.calculateDirectionalMovement(candles);
    const { diPlus, diMinus } = this.calculateDirectionalIndicators(dmPlus, dmMinus, trueRanges);
    const dx = this.calculateDX(diPlus, diMinus);

    if (dx.length < this.period) {
      return null;
    }

    const adxValues = this.calculateWildersSmoothing(dx, this.period);
    return adxValues.length > 0 ? adxValues[adxValues.length - 1] : null;
  }

  /**
   * Рассчитывает полные данные ADX с DI+ и DI-
   */
  public calculateFullADX(candles: TIndicatorCandle[]): {
    adx: number | null;
    diPlus: number | null;
    diMinus: number | null;
  } {
    if (candles.length < this.period * 2) {
      return { adx: null, diPlus: null, diMinus: null };
    }

    const trueRanges = this.calculateTrueRange(candles);
    const { dmPlus, dmMinus } = this.calculateDirectionalMovement(candles);
    const { diPlus, diMinus } = this.calculateDirectionalIndicators(dmPlus, dmMinus, trueRanges);
    const dx = this.calculateDX(diPlus, diMinus);

    if (dx.length < this.period || diPlus.length === 0 || diMinus.length === 0) {
      return { adx: null, diPlus: null, diMinus: null };
    }

    const adxValues = this.calculateWildersSmoothing(dx, this.period);

    return {
      adx: adxValues.length > 0 ? adxValues[adxValues.length - 1] : null,
      diPlus: diPlus[diPlus.length - 1],
      diMinus: diMinus[diMinus.length - 1],
    };
  }

  /**
   * Рассчитывает серию значений ADX для всех доступных периодов
   */
  public calculateADXSeries(
    candles: TIndicatorCandle[],
  ): { timestamp: number; adx: number; diPlus: number; diMinus: number }[] {
    if (candles.length < this.period * 2) {
      return [];
    }

    const result: { timestamp: number; adx: number; diPlus: number; diMinus: number }[] = [];
    const trueRanges = this.calculateTrueRange(candles);
    const { dmPlus, dmMinus } = this.calculateDirectionalMovement(candles);
    const { diPlus, diMinus } = this.calculateDirectionalIndicators(dmPlus, dmMinus, trueRanges);
    const dx = this.calculateDX(diPlus, diMinus);

    if (dx.length < this.period) {
      return [];
    }

    const adxValues = this.calculateWildersSmoothing(dx, this.period);

    // Начинаем с индекса, который соответствует первому валидному ADX значению
    const startIndex = this.period * 2 - 1;

    for (let i = 0; i < adxValues.length; i++) {
      const candleIndex = startIndex + i;
      if (candleIndex < candles.length) {
        result.push({
          timestamp: candles[candleIndex].openTime,
          adx: adxValues[i],
          diPlus: diPlus[this.period - 1 + i],
          diMinus: diMinus[this.period - 1 + i],
        });
      }
    }

    return result;
  }

  /**
   * Определяет силу тренда на основе ADX
   */
  public getTrendStrength(adx: number): 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (adx < 20) return 'weak';
    if (adx < 40) return 'moderate';
    if (adx < 60) return 'strong';
    return 'very_strong';
  }

  /**
   * Определяет направление тренда на основе DI+ и DI-
   */
  public getTrendDirection(diPlus: number, diMinus: number): 'bullish' | 'bearish' | 'sideways' {
    const diff = Math.abs(diPlus - diMinus);
    if (diff < 5) return 'sideways'; // Слабая разница - боковое движение

    return diPlus > diMinus ? 'bullish' : 'bearish';
  }
}
