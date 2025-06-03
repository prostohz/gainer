export class HalfLife {
  /** Считает OLS-наклон Y = α + β·X (возвращает β). */
  private olsSlope(x: number[], y: number[]): number {
    if (x.length !== y.length) throw new Error('Длины X и Y не совпадают.');
    const n = x.length;

    // средние
    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;

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
   * @param p1  массив цен (актив 1), длина ≥ 3
   * @param p2  массив цен (актив 2), та же длина, что и p1
   * @returns   half-life в тех же барах, что входные данные.
   *            Infinity → mean-reversion не подтверждена.
   */
  calculate(p1: number[], p2: number[]): number {
    if (p1.length !== p2.length || p1.length < 3) {
      throw new Error('Ряды должны быть одинаковой длины ≥ 3.');
    }

    /* ---------- 1. Лог-цены ---------- */
    const log1 = p1.map(Math.log);
    const log2 = p2.map(Math.log);

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
