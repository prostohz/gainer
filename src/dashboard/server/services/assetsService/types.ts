import {
  TAsset24HrStats,
  TExchangeInfoSymbol,
} from '../../../../trading/providers/Binance/BinanceHTTPClient';

export type TAsset = TExchangeInfoSymbol &
  TAsset24HrStats & {
    usdtVolume: number;
  };
