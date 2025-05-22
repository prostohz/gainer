import {
  TExchangeInfoSymbol,
  TAsset24HrStats,
} from '../../../../trading/providers/Binance/BinanceHTTPClient';

export type TAsset = TExchangeInfoSymbol &
  TAsset24HrStats & {
    precision: number; // to pricePrecision
    volumePrecision: number;
    usdtVolume: number;
  };

export { TTimeframe, TCandle } from '../../../../trading/types';
