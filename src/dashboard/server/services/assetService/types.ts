import {
  TExchangeInfoSymbol,
  TAsset24HrStats,
} from '../../../../trading/providers/Binance/BinanceHTTPClient';

export type TAsset = TExchangeInfoSymbol &
  TAsset24HrStats & {
    precision: number;
    usdtVolume: number;
  };

export { TTimeframe, TKline } from '../../../../trading/types';
