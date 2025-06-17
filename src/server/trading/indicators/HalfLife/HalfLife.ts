import { mean } from 'mathjs';

import { TIndicatorCandle } from '../types';

export class HalfLife {
  /** Считает OLS-наклон Y = α + β·X (возвращает β). */
  private olsSlope(x: number[], y: number[]): number {
    if (x.length !== y.length) throw new Error('Длины X и Y не совпадают.');
    const n = x.length;

    const meanX = Number(mean(x));
    const meanY = Number(mean(y));

    // Σ((x-ẋ)(y-ẏ)) / Σ((x-ẋ)²)
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      num += dx * (y[i] - meanY);
      den += dx * dx;
    }
    return den === 0 ? NaN : num / den;
  }

  /**
   * Рассчитывает half-life (t₁/₂) спреда лог-цен двух активов.
   * @param pricesA  массив цен (актива A), длина ≥ 3
   * @param pricesB  массив цен (актива B), та же длина, что и pricesA
   * @returns   half-life в тех же барах, что входные данные.
   *            Infinity → mean-reversion не подтверждена.
   */
  public calculate(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]) {
    if (candlesA.length !== candlesB.length || candlesA.length < 3) {
      console.warn(
        'HalfLife: prices series have different lengths or less than 3 observations:',
        candlesA.length,
        candlesB.length,
      );

      return null;
    }

    const pricesA = candlesA.slice(-candlesA.length).map((candle) => candle.close);
    const pricesB = candlesB.slice(-candlesB.length).map((candle) => candle.close);

    /* ---------- 1. Лог-цены ---------- */
    const log1 = pricesA.map(Math.log);
    const log2 = pricesB.map(Math.log);

    /* ---------- 2. Бета хеджа (OLS slope log1 ~ β·log2) ---------- */
    const beta = this.olsSlope(log2, log1); // ковариация / дисперсия log2

    /* ---------- 3. Спред ---------- */
    const spread = log1.map((l1, i) => l1 - beta * log2[i]); // без интерсепта

    /* ---------- 4. AR(1): Sp_t = c + φ·Sp_{t-1} ---------- */
    const phi = this.olsSlope(spread.slice(0, -1), spread.slice(1));

    /* ---------- 5. Half-life ---------- */
    if (phi <= 0 || phi >= 1 || Number.isNaN(phi)) return Infinity;
    return Math.log(2) / -Math.log(phi);
  }
}
