export class BetaHedge {
  public calculateBeta(pricesA: number[], pricesB: number[]): number {
    // Validate input lengths
    if (pricesA.length !== pricesB.length) {
      throw new Error('Price series must have the same length');
    }

    if (pricesA.length < 2) {
      throw new Error('Price series must contain at least two data points');
    }

    // Calculate simple returns for each series
    const returnsA: number[] = [];
    const returnsB: number[] = [];

    for (let i = 1; i < pricesA.length; i += 1) {
      const prevA = pricesA[i - 1];
      const prevB = pricesB[i - 1];

      if (prevA === 0 || prevB === 0) {
        throw new Error('Price values must be non-zero');
      }

      returnsA.push(pricesA[i] / prevA - 1);
      returnsB.push(pricesB[i] / prevB - 1);
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
      throw new Error('Variance of benchmark returns is zero; beta is undefined');
    }

    return covariance / varianceB;
  }
}
