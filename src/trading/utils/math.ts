export const roundTo = (value: number, precision: number): number => {
  return Math.round(value * 10 ** precision) / 10 ** precision;
};

export const calculateMean = (values: number[]): number => {
  if (!values.length) {
    return 0;
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
};

export const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (!values.length) {
    return 0;
  }

  const squaredDifferences = values.map((value) => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / values.length;

  return Math.sqrt(variance);
};
