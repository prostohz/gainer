import {
  TAsset24HrStats,
  TExchangeInfoSymbol,
} from '../../../../trading/providers/Binance/BinanceHTTPClient';

export type TAsset = TExchangeInfoSymbol &
  TAsset24HrStats & {
    precision: number;
    usdtVolume: number;
  };

type TPriceLevelItem = {
  price: number;
  strength: number;
};

export type TPriceLevels = {
  supportLevels: TPriceLevelItem[];
  resistanceLevels: TPriceLevelItem[];
};
