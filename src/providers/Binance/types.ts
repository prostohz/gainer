import { EventEmitter } from 'events';

export type BinanceStreamType =
  | 'trade'
  | 'bookTicker'
  | 'ticker'
  | 'depth'
  | 'kline'
  | 'aggTrade'
  | 'miniTicker';

export interface BaseStreamSubscription {
  symbol: string;
}

export interface TradeSubscription extends BaseStreamSubscription {
  type: 'trade';
}

export interface BookTickerSubscription extends BaseStreamSubscription {
  type: 'bookTicker';
}

export interface TickerSubscription extends BaseStreamSubscription {
  type: 'ticker';
}

export interface MiniTickerSubscription extends BaseStreamSubscription {
  type: 'miniTicker';
}

export interface AggTradeSubscription extends BaseStreamSubscription {
  type: 'aggTrade';
}

export interface KlineSubscription extends BaseStreamSubscription {
  type: 'kline';
  interval: string;
}

export interface DepthSubscription extends BaseStreamSubscription {
  type: 'depth';
  depth?: number;
  speed?: '100ms';
}

export type StreamSubscription =
  | TradeSubscription
  | BookTickerSubscription
  | TickerSubscription
  | MiniTickerSubscription
  | AggTradeSubscription
  | KlineSubscription
  | DepthSubscription;

export interface BinanceTrade {
  e: 'trade'; // Event type
  E: number; // Event time
  s: string; // Symbol
  t: number; // Trade ID
  p: string; // Price
  q: string; // Quantity
  b: number; // Buyer order ID
  a: number; // Seller order ID
  T: number; // Trade time
  m: boolean; // Is the buyer the market maker?
  M: boolean; // Ignore
}

export interface BinanceBookTicker {
  e: 'bookTicker'; // Event type
  u: number; // Order book updateId
  s: string; // Symbol
  b: string; // Best bid price
  B: string; // Best bid qty
  a: string; // Best ask price
  A: string; // Best ask qty
}

export interface BinanceTicker {
  e: 'ticker'; // Event type
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w: string; // Weighted average price
  x: string; // First trade(F)-1 price
  c: string; // Last price
  Q: string; // Last quantity
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade Id
  n: number; // Total number of trades
}

export interface BinanceDepth {
  e: 'depthUpdate'; // Event type
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  b: [string, string][]; // Bids (price, quantity)
  a: [string, string][]; // Asks (price, quantity)
}

export interface BinanceKline {
  e: 'kline'; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
}

export interface BinanceAggTrade {
  e: 'aggTrade'; // Event type
  E: number; // Event time
  s: string; // Symbol
  a: number; // Aggregate trade ID
  p: string; // Price
  q: string; // Quantity
  f: number; // First trade ID
  l: number; // Last trade ID
  T: number; // Trade time
  m: boolean; // Is the buyer the market maker?
  M: boolean; // Ignore
}

export interface BinanceMiniTicker {
  e: 'miniTicker'; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
}

export type BinanceStreamData =
  | BinanceTrade
  | BinanceBookTicker
  | BinanceTicker
  | BinanceDepth
  | BinanceKline
  | BinanceAggTrade
  | BinanceMiniTicker;

export interface BinanceEventEmitter extends EventEmitter {
  on(event: 'connected' | 'disconnected' | 'reconnect_failed', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'message', listener: (data: BinanceStreamData) => void): this;
  on(event: 'response', listener: (response: unknown) => void): this;

  on(event: 'trade', listener: (data: BinanceTrade) => void): this;
  on(event: 'bookTicker', listener: (data: BinanceBookTicker) => void): this;
  on(event: 'ticker', listener: (data: BinanceTicker) => void): this;
  on(event: 'depth', listener: (data: BinanceDepth) => void): this;
  on(event: 'kline', listener: (data: BinanceKline) => void): this;
  on(event: 'aggTrade', listener: (data: BinanceAggTrade) => void): this;
  on(event: 'miniTicker', listener: (data: BinanceMiniTicker) => void): this;

  emit(event: 'connected' | 'disconnected' | 'reconnect_failed'): boolean;
  emit(event: 'error', error: Error): boolean;
  emit(event: 'message', data: BinanceStreamData): boolean;
  emit(event: 'response', response: unknown): boolean;

  emit(event: 'trade', data: BinanceTrade): boolean;
  emit(event: 'bookTicker', data: BinanceBookTicker): boolean;
  emit(event: 'ticker', data: BinanceTicker): boolean;
  emit(event: 'depth', data: BinanceDepth): boolean;
  emit(event: 'kline', data: BinanceKline): boolean;
  emit(event: 'aggTrade', data: BinanceAggTrade): boolean;
  emit(event: 'miniTicker', data: BinanceMiniTicker): boolean;
}
