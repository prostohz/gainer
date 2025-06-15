export class BetaHedge {
  public calculateBeta(pricesA: number[], pricesB: number[]) {
    const minLength = Math.min(pricesA.length, pricesB.length);

    const pA = pricesA.slice(-minLength);
    const pB = pricesB.slice(-minLength);

    if (pA.length < 2) {
      console.warn('BetaHedge: prices series have less than 2 observations:', pA.length);

      return null;
    }

    // Calculate simple returns for each series
    const returnsA: number[] = [];
    const returnsB: number[] = [];

    for (let i = 1; i < pA.length; i += 1) {
      const prevA = pA[i - 1];
      const prevB = pB[i - 1];

      if (prevA === 0 || prevB === 0) {
        console.warn('BetaHedge: price values must be non-zero:', prevA, prevB);

        return null;
      }

      returnsA.push(pA[i] / prevA - 1);
      returnsB.push(pB[i] / prevB - 1);
    }

    // Helper to compute mean
    const mean = (values: number[]): number =>
      values.reduce((acc, v) => acc + v, 0) / values.length;

    const meanA = mean(returnsA);
    const meanB = mean(returnsB);

    // Compute covariance and variance
    let covariance = 0;
    let varianceB = 0;

    for (let i = 0; i < returnsA.length; i += 1) {
      const diffA = returnsA[i] - meanA;
      const diffB = returnsB[i] - meanB;

      covariance += diffA * diffB;
      varianceB += diffB * diffB;
    }

    covariance /= returnsA.length;
    varianceB /= returnsB.length;

    if (varianceB === 0) {
      console.warn('BetaHedge: variance of benchmark returns is zero; beta is undefined');

      return null;
    }

    return covariance / varianceB;
  }
}
