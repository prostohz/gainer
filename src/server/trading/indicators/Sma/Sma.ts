import { TIndicatorCandle } from '../types';

export class Sma {
  public calculateSMA(candles: TIndicatorCandle[]): number | null {
    return candles.reduce((acc, c) => acc + c.close, 0) / candles.length;
  }
}
