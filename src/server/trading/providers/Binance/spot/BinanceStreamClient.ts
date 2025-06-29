import WebSocket from 'ws';
import { EventEmitter } from 'events';

type BinanceStreamType =
  | 'trade'
  | 'bookTicker'
  | 'ticker'
  | 'depth'
  | 'kline'
  | 'aggTrade'
  | 'miniTicker';

type TBaseStreamSubscription = {
  symbol: string;
};

type TTradeSubscription = TBaseStreamSubscription & {
  type: 'trade';
};

type TBookTickerSubscription = TBaseStreamSubscription & {
  type: 'bookTicker';
};

type TTickerSubscription = TBaseStreamSubscription & {
  type: 'ticker';
};

type TMiniTickerSubscription = TBaseStreamSubscription & {
  type: 'miniTicker';
};

type TAggTradeSubscription = TBaseStreamSubscription & {
  type: 'aggTrade';
};

type TKlineSubscription = TBaseStreamSubscription & {
  type: 'kline';
  interval: string;
};

type TDepthSubscription = TBaseStreamSubscription & {
  type: 'depth';
  depth?: number;
  speed?: '100ms';
};

type TStreamSubscription =
  | TTradeSubscription
  | TBookTickerSubscription
  | TTickerSubscription
  | TMiniTickerSubscription
  | TAggTradeSubscription
  | TKlineSubscription
  | TDepthSubscription;

type TBinanceTrade = {
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
};

type TBinanceBookTicker = {
  e: 'bookTicker'; // Event type
  u: number; // Order book updateId
  s: string; // Symbol
  b: string; // Best bid price
  B: string; // Best bid qty
  a: string; // Best ask price
  A: string; // Best ask qty
};

type TBinanceTicker = {
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
};

type TBinanceDepth = {
  e: 'depthUpdate'; // Event type
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  b: [string, string][]; // Bids (price, quantity)
  a: [string, string][]; // Asks (price, quantity)
};

type TBinanceKline = {
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
};

type TBinanceAggTrade = {
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
};

type TBinanceMiniTicker = {
  e: 'miniTicker'; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
};

type BinanceStreamData =
  | TBinanceTrade
  | TBinanceBookTicker
  | TBinanceTicker
  | TBinanceDepth
  | TBinanceKline
  | TBinanceAggTrade
  | TBinanceMiniTicker;

interface BinanceEventEmitter extends EventEmitter {
  on(event: 'connected' | 'disconnected' | 'reconnect_failed', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'message', listener: (data: BinanceStreamData) => void): this;
  on(event: 'response', listener: (response: unknown) => void): this;

  on(event: 'trade', listener: (data: TBinanceTrade) => void): this;
  on(event: 'bookTicker', listener: (data: TBinanceBookTicker) => void): this;
  on(event: 'ticker', listener: (data: TBinanceTicker) => void): this;
  on(event: 'depth', listener: (data: TBinanceDepth) => void): this;
  on(event: 'kline', listener: (data: TBinanceKline) => void): this;
  on(event: 'aggTrade', listener: (data: TBinanceAggTrade) => void): this;
  on(event: 'miniTicker', listener: (data: TBinanceMiniTicker) => void): this;

  emit(event: 'connected' | 'disconnected' | 'reconnect_failed'): boolean;
  emit(event: 'error', error: Error): boolean;
  emit(event: 'message', data: BinanceStreamData): boolean;
  emit(event: 'response', response: unknown): boolean;

  emit(event: 'trade', data: TBinanceTrade): boolean;
  emit(event: 'bookTicker', data: TBinanceBookTicker): boolean;
  emit(event: 'ticker', data: TBinanceTicker): boolean;
  emit(event: 'depth', data: TBinanceDepth): boolean;
  emit(event: 'kline', data: TBinanceKline): boolean;
  emit(event: 'aggTrade', data: TBinanceAggTrade): boolean;
  emit(event: 'miniTicker', data: TBinanceMiniTicker): boolean;
}

class BinanceStreamClient extends EventEmitter implements BinanceEventEmitter {
  private readonly baseUrl = 'wss://stream.binance.com:9443';
  private readonly subscriptions: Set<string> = new Set();

  private readonly RECONNECT_DELAY = 3000;
  private readonly PING_INTERVAL_MS = 30000;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  private socket: WebSocket | null = null;

  private reconnectAttempts = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  public connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket уже подключен');
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket уже в процессе подключения');
      return;
    }

    // Если есть подписки, используем комбинированный поток
    if (this.subscriptions.size > 0) {
      const streams = Array.from(this.subscriptions);
      const url = `${this.baseUrl}/stream?streams=${streams.join('/')}`;

      console.log(`Подключение к Binance WebSocket: ${url}`);
      this.socket = new WebSocket(url);
    } else {
      // Если подписок нет, подключаемся к базовому WebSocket
      console.log(`Подключение к базовому Binance WebSocket`);
      this.socket = new WebSocket(`${this.baseUrl}/ws`);
    }

    this.socket.onopen = () => {
      console.log('Соединение с Binance установлено');
      this.reconnectAttempts = 0;
      this.setupPingInterval();
      this.emit('connected');
    };

    this.socket.onmessage = (event: WebSocket.MessageEvent) => {
      try {
        let message: string;

        if (typeof event.data === 'string') {
          message = event.data;
        } else if (event.data instanceof Buffer) {
          message = event.data.toString();
        } else {
          message = JSON.stringify(event.data);
        }

        const response = JSON.parse(message);

        // Обработка сообщений комбинированного потока
        if (response.stream && response.data) {
          const streamName = response.stream;
          const data = response.data;

          // Определяем тип потока из имени
          const streamParts = streamName.split('@');
          if (streamParts.length >= 2) {
            const streamType = streamParts[1].split('_')[0] as BinanceStreamType;

            // Отправляем событие с данными
            this.emit('message', data);
            this.emit(streamType, data);
          }
        }
        // Обработка сообщений обычного потока
        else if (response.e) {
          this.emit('message', response);
          this.emit(response.e, response);
        }
      } catch (error) {
        console.error('Ошибка при обработке сообщения:', error);
      }
    };

    this.socket.onerror = (event: WebSocket.ErrorEvent) => {
      console.error('Ошибка WebSocket:', event);
      this.emit('error', event);
    };

    this.socket.onclose = (event: WebSocket.CloseEvent) => {
      console.log(`WebSocket закрыт: ${event.code} ${event.reason}`);
      this.clearPingInterval();

      if (event.code === 1000) {
        console.log('Соединение закрыто нормально');
      } else {
        console.log('Соединение с Binance разорвано');
        this.emit('disconnected');
        this.handleReconnect();
      }
    };
  }

  public disconnect(): void {
    if (this.socket) {
      this.clearPingInterval();
      this.socket.close();
      this.socket = null;
      console.log('Соединение с Binance закрыто');
      this.emit('disconnected');
    }
  }

  public subscribe(subscription: TStreamSubscription): void {
    const streamName = this.getStreamName(subscription);
    if (!streamName) return;

    // Если это первая подписка или сокет закрыт, нужно (пере)подключиться
    const needReconnect =
      this.subscriptions.size === 0 || !this.socket || this.socket.readyState === WebSocket.CLOSED;

    this.subscriptions.add(streamName);

    if (needReconnect) {
      this.disconnect();
      this.connect();
    }
  }

  public unsubscribe(subscription: TStreamSubscription): void {
    const streamName = this.getStreamName(subscription);
    if (!streamName) return;

    this.subscriptions.delete(streamName);

    // Если подписок не осталось, закрываем соединение
    if (this.subscriptions.size === 0) {
      this.disconnect();
    } else {
      // Иначе переподключаемся с новым набором подписок
      this.disconnect();
      this.connect();
    }
  }

  public unsubscribeMultiple(subscriptions: TStreamSubscription[]): void {
    for (const subscription of subscriptions) {
      this.unsubscribe(subscription);
    }
  }

  public subscribeMultiple(subscriptions: TStreamSubscription[]): void {
    let needReconnect = false;

    for (const subscription of subscriptions) {
      const streamName = this.getStreamName(subscription);
      if (streamName) {
        // Если это первая подписка, нужно будет переподключиться
        if (this.subscriptions.size === 0) {
          needReconnect = true;
        }

        this.subscriptions.add(streamName);
      }
    }

    if (needReconnect || !this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.disconnect();
      this.connect();
    }
  }

  private getStreamName(subscription: TStreamSubscription): string | null {
    const { symbol, type } = subscription;
    const lowerSymbol = symbol.toLowerCase();

    switch (type) {
      case 'trade':
        return `${lowerSymbol}@trade`;
      case 'bookTicker':
        return `${lowerSymbol}@bookTicker`;
      case 'ticker':
        return `${lowerSymbol}@ticker`;
      case 'miniTicker':
        return `${lowerSymbol}@miniTicker`;
      case 'aggTrade':
        return `${lowerSymbol}@aggTrade`;
      case 'kline': {
        const klineSubscription = subscription as TKlineSubscription;
        return `${lowerSymbol}@kline_${klineSubscription.interval}`;
      }
      case 'depth': {
        const depthSubscription = subscription as TDepthSubscription;
        const { depth, speed } = depthSubscription;
        if (depth) {
          return `${lowerSymbol}@depth${depth}${speed ? '@' + speed : ''}`;
        }
        return `${lowerSymbol}@depth${speed ? '@' + speed : ''}`;
      }
      default:
        const _exhaustiveCheck: never = type;
        console.error(`Неизвестный тип потока: ${_exhaustiveCheck}`);
        return null;
    }
  }

  private setupPingInterval(): void {
    this.clearPingInterval();
    // Отправляем ping каждые 30 секунд для поддержания соединения
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.ping();
      }
    }, this.PING_INTERVAL_MS);
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      const delay = this.RECONNECT_DELAY * this.reconnectAttempts;
      console.log(`Попытка переподключения через ${delay}мс...`);

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error(`Не удалось переподключиться после ${this.MAX_RECONNECT_ATTEMPTS} попыток`);
      this.emit('reconnect_failed');
    }
  }
}

export {
  BinanceStreamClient,
  BinanceStreamType,
  TStreamSubscription,
  TBinanceTrade,
  TBinanceBookTicker,
  TBinanceTicker,
  TBinanceDepth,
  TBinanceKline,
  TBinanceAggTrade,
  TBinanceMiniTicker,
};
