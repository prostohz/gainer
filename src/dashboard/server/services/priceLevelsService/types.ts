import { TExchangeInfoSymbol } from '../../../../trading/providers/Binance/BinanceHTTPClient';

type Kline = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
};

type TimeframeKlines = {
  [timeframe: string]: Kline[];
};

type Level = {
  price: number;
  strength: number;
};

export type TPriceLevels = {
  asset: TExchangeInfoSymbol;
  precision: number;
  timeframeKlines: TimeframeKlines;
  supportLevels: Level[];
  resistanceLevels: Level[];
};
