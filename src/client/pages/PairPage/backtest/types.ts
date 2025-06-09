export type TPositionDirection = 'buy-sell' | 'sell-buy';

export type TBacktestTrade = {
  id: number;
  direction: TPositionDirection;
  symbolA: string;
  symbolB: string;
  openPriceA: number;
  closePriceA: number;
  openPriceB: number;
  closePriceB: number;
  openTime: number;
  closeTime: number;
  profitPercent: number;
  openReason: string;
  closeReason: string;
};
