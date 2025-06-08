import { TTimeframe } from '../../shared/types';
import { run } from '../trading/strategies/MeanReversionStrategy/backtest';

export const backtest = async (
  symbolA: string,
  symbolB: string,
  timeframe: TTimeframe,
  startTimestamp: number,
  endTimestamp: number,
) => {
  return await run(symbolA, symbolB, timeframe, startTimestamp, endTimestamp);
};
