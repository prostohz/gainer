import { run } from '../trading/strategies/MeanReversionStrategy/backtest';

export const backtest = (pairs: string[], startTimestamp: number, endTimestamp: number) => {
  return run(pairs, startTimestamp, endTimestamp);
};
