import { TTimeframe } from '../../../../../shared/types';
import { BinanceHTTPRateLimitManager } from './BinanceHTTPRateLimitManager';

type TAssetFilter =
  | {
      filterType: 'PRICE_FILTER';
      tickSize: string;
    }
  | {
      filterType: 'LOT_SIZE';
      stepSize: string;
    };

type TRawAsset = {
  symbol: string;
  status: string;
  baseAsset: string;
  baseAssetPrecision: number;
  quoteAsset: string;
  quoteAssetPrecision: number;
  baseCommissionPrecision: number;
  quoteCommissionPrecision: number;
  orderTypes: string[];
  icebergAllowed: boolean;
  ocoAllowed: boolean;
  quoteOrderQtyMarketAllowed: boolean;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  filters: TAssetFilter[];
  permissions: string[];
  defaultSelfTradePreventionMode?: string;
  allowedSelfTradePreventionModes?: string[];
};

type TRawAsset24HrStats = {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
};

type TRawCandle = [
  number, // Open time
  string, // Open
  string, // High
  string, // Low
  string, // Close
  string, // Volume
  number, // Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string, // Ignore
];

type TRawTrade = {
  a: number; // Aggregate tradeId
  p: string; // Price
  q: string; // Quantity
  f: number; // First tradeId
  l: number; // Last tradeId
  T: number; // Timestamp
  m: boolean; // Was the buyer the maker?
  M: boolean; // Was the trade the best price match?
};

type TAsset = {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision: number;
  quoteAssetPrecision: number;
  baseCommissionPrecision: number;
  quoteCommissionPrecision: number;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  filters: TAssetFilter[];
};

type TAsset24HrStats = {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
};

type TCandle = {
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

type TTrade = {
  symbol: string;
  tradeId: number;
  price: string;
  quantity: string;
  firstTradeId: number;
  lastTradeId: number;
  timestamp: number;
  isBuyerMaker: boolean;
  isBestPriceMatch: boolean;
};

type TBinanceAPIResponse = Record<string, unknown>;

class BinanceHTTPClient {
  private static instance: BinanceHTTPClient;

  private readonly baseUrl = 'https://api.binance.com/api/v3';
  private readonly rateLimitManager = new BinanceHTTPRateLimitManager();

  private constructor() {}

  /**
   * Форматирование данных о торговой паре
   */
  private formatAsset(asset: TRawAsset): TAsset {
    return {
      symbol: asset.symbol,
      status: asset.status,
      baseAsset: asset.baseAsset,
      quoteAsset: asset.quoteAsset,
      baseAssetPrecision: asset.baseAssetPrecision,
      quoteAssetPrecision: asset.quoteAssetPrecision,
      baseCommissionPrecision: asset.baseCommissionPrecision,
      quoteCommissionPrecision: asset.quoteCommissionPrecision,
      isSpotTradingAllowed: asset.isSpotTradingAllowed,
      isMarginTradingAllowed: asset.isMarginTradingAllowed,
      filters: asset.filters,
    };
  }

  /**
   * Форматирование данных о статистике 24 часов для торговой пары
   */
  private format24HrStats(stats: TRawAsset24HrStats): TAsset24HrStats {
    return {
      symbol: stats.symbol,
      lastPrice: stats.lastPrice,
      priceChange: stats.priceChange,
      priceChangePercent: stats.priceChangePercent,
      volume: stats.volume,
      quoteVolume: stats.quoteVolume,
    };
  }

  /**
   * Форматирование данных о свече
   */
  private formatCandle(candle: TRawCandle): TCandle {
    return {
      openTime: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
      closeTime: candle[6],
      quoteAssetVolume: candle[7],
      numberOfTrades: candle[8],
      takerBuyBaseAssetVolume: candle[9],
      takerBuyQuoteAssetVolume: candle[10],
    };
  }

  /**
   * Форматирование данных о сделке
   */
  private formatTrade(symbol: string, trade: TRawTrade): TTrade {
    return {
      symbol,
      tradeId: trade.a,
      price: trade.p,
      quantity: trade.q,
      firstTradeId: trade.f,
      lastTradeId: trade.l,
      timestamp: trade.T,
      isBuyerMaker: trade.m,
      isBestPriceMatch: trade.M,
    };
  }

  /**
   * Запрос к API Binance с учётом лимитов
   */
  private async request(url: string, weight: number): Promise<TBinanceAPIResponse> {
    await this.rateLimitManager.waitIfNeeded(weight);

    try {
      const response = await fetch(`${this.baseUrl}${url}`);

      this.rateLimitManager.updateFromHeaders(response.headers);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = parseInt(retryAfter ?? '0', 10) * 1_000;

          console.warn(
            `Превышен лимит API (HTTP 429). Ожидание ${waitTime}мс перед повторной попыткой.`,
          );

          await new Promise((resolve) => setTimeout(resolve, waitTime));

          return this.request(url, weight);
        }

        if (response.status === 418) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = parseInt(retryAfter ?? '0', 10);

          throw new Error(
            `IP заблокирован Binance API (HTTP 418). Необходимо ждать ${Math.round(waitTime)} секунд перед следующим запросом.`,
          );
        }

        let errorMessage = `HTTP error! Status: ${response.status}, ${response.statusText}`;
        try {
          const text = await response.text();
          try {
            const json = JSON.parse(text);

            if (json.code && json.msg) {
              errorMessage = `${errorMessage}, code: ${json.code}, msg: ${json.msg}`;
            } else {
              errorMessage = `${errorMessage}, body: ${text}`;
            }
          } catch {
            errorMessage = `${errorMessage}, body: ${text}`;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'UND_ERR_CONNECT_TIMEOUT'
      ) {
        throw new Error(
          'Ошибка таймаута соединения с Binance API. Проверьте интернет-соединение или попробуйте позже.',
        );
      }
      throw error;
    }
  }

  /**
   * Получение экземпляра BinanceHTTPClient
   */
  public static getInstance(): BinanceHTTPClient {
    if (!BinanceHTTPClient.instance) {
      BinanceHTTPClient.instance = new BinanceHTTPClient();
    }
    return BinanceHTTPClient.instance;
  }

  /**
   * Получение списка всех торгуемых активов на Binance
   */
  public async fetchAssets(): Promise<TAsset[]> {
    try {
      const data = await this.request('/exchangeInfo', 20);

      return (data as { symbols: TRawAsset[] }).symbols
        .filter((symbol: TRawAsset) => symbol.status === 'TRADING')
        .map(this.formatAsset);
    } catch (error) {
      console.error(`Ошибка при получении списка торгуемых активов: ${error}`);
      throw error;
    }
  }

  /**
   * Получение статистики 24 часов для всех торгуемых активов
   */
  public async getAssets24HrStats(): Promise<TAsset24HrStats[]> {
    try {
      const data = await this.request('/ticker/24hr', 80);

      return (data as unknown as TRawAsset24HrStats[]).map(this.format24HrStats);
    } catch (error) {
      console.error(`Ошибка при получении статистики 24 часов: ${error}`);
      throw error;
    }
  }

  /**
   * Получение информации о торговой паре
   */
  public async fetchAsset(symbol: string): Promise<TAsset> {
    try {
      const data = await this.request(`/exchangeInfo?symbol=${symbol}`, 10);
      const foundAsset = (data as { symbols: TRawAsset[] }).symbols.find(
        (item: TRawAsset) => item.symbol === symbol,
      );

      if (!foundAsset) {
        throw new Error(`Asset ${symbol} not found`);
      }

      return this.formatAsset(foundAsset);
    } catch (error) {
      console.error(`Ошибка при получении информации о торговой паре: ${error}`);
      throw error;
    }
  }

  /**
   * Получает текущую цену для указанного символа
   */
  public async fetchAssetPrice(symbol: string): Promise<string> {
    try {
      const data = await this.request(`/ticker/price?symbol=${symbol}`, 1);

      return (data as { price: string }).price;
    } catch (error) {
      console.error(`Ошибка при получении текущей цены для ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Получение исторических свечей через REST API
   */
  public async fetchAssetCandles({
    symbol,
    timeframe,
    limit,
    startTime,
    endTime,
  }: {
    symbol: string;
    timeframe: TTimeframe;
    limit?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<TCandle[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('symbol', symbol);
      queryParams.set('interval', timeframe);
      if (limit) {
        queryParams.set('limit', limit.toString());
      }
      if (startTime) {
        queryParams.set('startTime', startTime.toString());
      }
      if (endTime) {
        queryParams.set('endTime', endTime.toString());
      }

      const data = await this.request(`/klines?${queryParams.toString()}`, 2);

      return (data as unknown as TRawCandle[]).map(this.formatCandle);
    } catch (error) {
      console.error(`Ошибка при получении исторических свечей: ${error}`);
      throw error;
    }
  }

  /**
   * Получение исторических сделок для указанного символа
   */
  public async fetchAssetTrades(
    symbol: string,
    limit: number,
    { fromId, startTime, endTime }: { fromId?: number; startTime?: number; endTime?: number } = {},
  ): Promise<TTrade[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('symbol', symbol);
      queryParams.set('limit', limit.toString());
      if (fromId) {
        queryParams.set('fromId', fromId.toString());
      }
      if (startTime) {
        queryParams.set('startTime', startTime.toString());
      }
      if (endTime) {
        queryParams.set('endTime', endTime.toString());
      }

      const data = await this.request(`/aggTrades?${queryParams.toString()}`, 4);

      return (data as unknown as TRawTrade[]).map((trade: TRawTrade) =>
        this.formatTrade(symbol, trade),
      );
    } catch (error) {
      console.error(`Ошибка при получении исторических сделок: ${error}`);
      throw error;
    }
  }
}

export { BinanceHTTPClient, TAsset, TAsset24HrStats, TCandle, TTrade };
