import { EventEmitter } from 'events';

type BinanceWebSocketEvent =
  | 'trade'
  | 'aggTrade'
  | 'kline'
  | 'miniTicker'
  | 'ticker'
  | 'bookTicker'
  | 'depth';

type SubscriptionParams = {
  symbol: string;
  interval?: string;
  levels?: number;
  updateSpeed?: '1000ms' | '100ms';
};

class BinanceWebSocketClient extends EventEmitter {
  private static instance: BinanceWebSocketClient;

  private socket: WebSocket | null = null;
  private baseUrl = 'wss://stream.binance.com:9443';
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): BinanceWebSocketClient {
    if (!BinanceWebSocketClient.instance) {
      BinanceWebSocketClient.instance = new BinanceWebSocketClient();
    }
    return BinanceWebSocketClient.instance;
  }

  public connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected');
      return;
    }

    try {
      this.socket = new WebSocket(`${this.baseUrl}/ws`);

      this.socket.onopen = () => {
        console.log('Binance WebSocket connected');
        this.reconnectAttempts = 0;
        this.setupPingInterval();
        this.resubscribeAll();
        this.emit('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e) {
            // Regular event message
            this.emit('message', data);
            this.emit(data.e, data);
          } else if (data.result !== undefined) {
            // Response to a request
            this.emit('response', data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.clearPingInterval();
        this.emit('disconnected');
        this.handleReconnect();
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.handleReconnect();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.clearPingInterval();
      this.socket.close();
      this.socket = null;
      this.emit('disconnected');
    }
  }

  public subscribe(event: BinanceWebSocketEvent, params: SubscriptionParams): void {
    const streamName = this.getStreamName(event, params);
    if (!streamName) return;

    this.subscriptions.add(streamName);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSubscribeRequest([streamName]);
    } else {
      this.connect();
    }
  }

  public unsubscribe(event: BinanceWebSocketEvent, params: SubscriptionParams): void {
    const streamName = this.getStreamName(event, params);
    if (!streamName) return;

    this.subscriptions.delete(streamName);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendUnsubscribeRequest([streamName]);
    }
  }

  public subscribeMultiple(
    subscriptions: Array<{
      event: BinanceWebSocketEvent;
      params: SubscriptionParams;
    }>,
  ): void {
    const streamNames = subscriptions
      .map((sub) => this.getStreamName(sub.event, sub.params))
      .filter((name): name is string => !!name);

    streamNames.forEach((name) => this.subscriptions.add(name));

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSubscribeRequest(streamNames);
    } else {
      this.connect();
    }
  }

  private getStreamName(event: BinanceWebSocketEvent, params: SubscriptionParams): string | null {
    const { symbol, interval, levels, updateSpeed } = params;
    const lowerSymbol = symbol.toLowerCase();

    switch (event) {
      case 'trade':
        return `${lowerSymbol}@trade`;
      case 'aggTrade':
        return `${lowerSymbol}@aggTrade`;
      case 'kline':
        if (!interval) {
          console.error('Interval is required for kline subscription');
          return null;
        }
        return `${lowerSymbol}@kline_${interval}`;
      case 'miniTicker':
        return `${lowerSymbol}@miniTicker`;
      case 'ticker':
        return `${lowerSymbol}@ticker`;
      case 'bookTicker':
        return `${lowerSymbol}@bookTicker`;
      case 'depth':
        if (levels) {
          return `${lowerSymbol}@depth${levels}${updateSpeed === '100ms' ? '@100ms' : ''}`;
        }
        return `${lowerSymbol}@depth${updateSpeed === '100ms' ? '@100ms' : ''}`;
      default:
        console.error(`Unknown event type: ${event}`);
        return null;
    }
  }

  private sendSubscribeRequest(streams: string[]): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const request = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now(),
    };

    this.socket.send(JSON.stringify(request));
  }

  private sendUnsubscribeRequest(streams: string[]): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const request = {
      method: 'UNSUBSCRIBE',
      params: streams,
      id: Date.now(),
    };

    this.socket.send(JSON.stringify(request));
  }

  private resubscribeAll(): void {
    if (this.subscriptions.size > 0) {
      this.sendSubscribeRequest(Array.from(this.subscriptions));
    }
  }

  private setupPingInterval(): void {
    this.clearPingInterval();
    // Send pong frame every 15 seconds to keep connection alive
    // Binance sends ping every 20 seconds and expects pong within a minute
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ pong: Date.now() }));
      }
    }, 15000);
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`Attempting to reconnect in ${delay}ms...`);

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
      this.emit('reconnect_failed');
    }
  }
}

export default BinanceWebSocketClient;
