import { TBinanceBookTicker, TBinanceTrade } from '../../providers/Binance/BinanceStreamClient';

export type TTradeBuffer = {
  trades: TBinanceTrade[];
  book: TBinanceBookTicker | null;
  lastPrice: number;
};

export type TAnomalyCheck = {
  isAnomaly: boolean;
  feasibility: boolean;
  lastPrice: number;
  lastTradePrice: number;
  priceChange: number;
  askPrice: number;
  bidPrice: number;
};
