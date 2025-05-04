import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  BinanceStreamType,
  StreamSubscription,
  BinanceEventEmitter,
  KlineSubscription,
  DepthSubscription,
} from './types';

class BinanceCombinedStreamClient extends EventEmitter implements BinanceEventEmitter {
  private static instance: BinanceCombinedStreamClient;

  private readonly baseUrl = 'wss://stream.binance.com:9443';
  private readonly subscriptions: Set<string> = new Set();

  private readonly RECONNECT_DELAY = 3000;
  private readonly PING_INTERVAL_MS = 30000;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  private socket: WebSocket | null = null;

  private reconnectAttempts = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): BinanceCombinedStreamClient {
    if (!BinanceCombinedStreamClient.instance) {
      BinanceCombinedStreamClient.instance = new BinanceCombinedStreamClient();
    }
    return BinanceCombinedStreamClient.instance;
  }

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

    this.socket.onmessage = (event) => {
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

    this.socket.onerror = (error) => {
      console.error('Ошибка WebSocket:', error);
      this.emit('error', error);
    };

    this.socket.onclose = (event) => {
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

  public subscribe(subscription: StreamSubscription): void {
    const streamName = this.getStreamName(subscription);
    if (!streamName) return;

    // Если это первая подписка или сокет закрыт, нужно (пере)подключиться
    const needReconnect =
      this.subscriptions.size === 0 || !this.socket || this.socket.readyState === WebSocket.CLOSED;

    this.subscriptions.add(streamName);

    if (needReconnect) {
      this.disconnect(); // Закрываем текущее соединение, если есть
      this.connect(); // Подключаемся с новыми параметрами
    }
  }

  public unsubscribe(subscription: StreamSubscription): void {
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

  public subscribeMultiple(subscriptions: StreamSubscription[]): void {
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

  private getStreamName(subscription: StreamSubscription): string | null {
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
        // Явное приведение типа для kline
        const klineSubscription = subscription as KlineSubscription;
        return `${lowerSymbol}@kline_${klineSubscription.interval}`;
      }
      case 'depth': {
        // Явное приведение типа для depth
        const depthSubscription = subscription as DepthSubscription;
        const { depth, speed } = depthSubscription;
        if (depth) {
          return `${lowerSymbol}@depth${depth}${speed ? '@' + speed : ''}`;
        }
        return `${lowerSymbol}@depth${speed ? '@' + speed : ''}`;
      }
      default:
        // Это никогда не должно произойти благодаря типизации
        const _exhaustiveCheck: never = type;
        console.error(`Unknown stream type: ${_exhaustiveCheck}`);
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

export default BinanceCombinedStreamClient;
export {
  BinanceStreamType,
  StreamSubscription,
  BinanceTrade,
  BinanceBookTicker,
  BinanceTicker,
  BinanceDepth,
  BinanceKline,
  BinanceAggTrade,
  BinanceMiniTicker,
} from './types';
