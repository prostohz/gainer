import { run } from '../trading/strategies/MeanReversionStrategy/backtest';

export const backtest = (
  pairs: {
    assetA: {
      baseAsset: string;
      quoteAsset: string;
    };
    assetB: {
      baseAsset: string;
      quoteAsset: string;
    };
  }[],
  startTimestamp: number,
  endTimestamp: number,
) => {
  return run(pairs, startTimestamp, endTimestamp);
};
