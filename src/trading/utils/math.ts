export const roundTo = (value: number, precision: number): number => {
  return Math.round(value * 10 ** precision) / 10 ** precision;
};
