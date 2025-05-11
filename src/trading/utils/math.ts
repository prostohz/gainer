import * as R from 'remeda';

export const roundTo = (value: number, precision: number): number => {
  return Math.round(value * 10 ** precision) / 10 ** precision;
};

export const mean = (values: number[]): number => {
  return R.meanBy(values, (value) => value);
};
