declare module '*/data.json' {
  export interface AssetFilter {
    filterType: string;
    [key: string]: unknown; // Для различных полей в зависимости от типа фильтра
  }

  export interface Asset {
    symbol: string;
    status: string;
    baseAsset: string;
    baseAssetPrecision: number;
    quoteAsset: string;
    quotePrecision: number;
    quoteAssetPrecision: number;
    baseCommissionPrecision: number;
    quoteCommissionPrecision: number;
    orderTypes: string[];
    icebergAllowed: boolean;
    ocoAllowed: boolean;
    otoAllowed: boolean;
    quoteOrderQtyMarketAllowed: boolean;
    allowTrailingStop: boolean;
    cancelReplaceAllowed: boolean;
    amendAllowed: boolean;
    isSpotTradingAllowed: boolean;
    isMarginTradingAllowed: boolean;
    filters: AssetFilter[];
    permissions: string[];
    permissionSets: string[][];
    defaultSelfTradePreventionMode: string;
    allowedSelfTradePreventionModes: string[];
  }

  export interface Kline {
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
  }

  export interface TimeframeKlines {
    [timeframe: string]: Kline[];
  }

  export interface Level {
    price: number;
    strength: number;
  }

  export interface PriceLevelsData {
    asset: Asset;
    precision: number;
    timeframeKlines: TimeframeKlines;
    supportLevels: Level[];
    resistanceLevels: Level[];
  }

  const data: PriceLevelsData;

  export default data;
}
