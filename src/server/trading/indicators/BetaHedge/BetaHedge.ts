import { TIndicatorCandle } from '../types';

export class BetaHedge {
  public calculateBeta(candlesA: TIndicatorCandle[], candlesB: TIndicatorCandle[]) {
    const minLength = Math.min(candlesA.length, candlesB.length);

    const pricesA = candlesA.slice(-minLength).map((candle) => candle.close);
    const pricesB = candlesB.slice(-minLength).map((candle) => candle.close);

    if (pricesA.length < 2) {
      console.warn('BetaHedge: prices series have less than 2 observations:', pricesA.length);

      return null;
    }

    const mean = (values: number[]): number =>
      values.reduce((acc, v) => acc + v, 0) / values.length;

    const meanA = mean(pricesA);
    const meanB = mean(pricesB);

    // Compute numerator and denominator for slope (beta)
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < pricesA.length; i += 1) {
      const diffA = pricesA[i] - meanA;
      const diffB = pricesB[i] - meanB;

      numerator += diffA * diffB;
      denominator += diffA * diffA;
    }

    if (denominator === 0) {
      console.warn('BetaHedge: variance of independent prices is zero; beta is undefined');

      return null;
    }

    return numerator / denominator;
  }

  public rollingBeta(
    candlesA: TIndicatorCandle[],
    candlesB: TIndicatorCandle[],
    window: number = 100,
  ) {
    const minLength = Math.min(candlesA.length, candlesB.length);

    if (minLength < window + 1) {
      return [];
    }

    const pA = candlesA.slice(-minLength);
    const pB = candlesB.slice(-minLength);

    const result: { timestamp: number; value: number | null }[] = [];
    for (let i = window; i < pA.length && i < pB.length; i++) {
      const windowA = pA.slice(i - window, i);
      const windowB = pB.slice(i - window, i);

      const beta = this.calculateBeta(windowA, windowB);

      result.push({
        timestamp: Number(pA[i].openTime),
        value: beta,
      });
    }

    return result;
  }
}
