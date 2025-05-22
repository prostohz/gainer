export type TTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export type TCandle = {
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  numberOfTrades: number;
  volume: string;
  quoteAssetVolume: string;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
};
