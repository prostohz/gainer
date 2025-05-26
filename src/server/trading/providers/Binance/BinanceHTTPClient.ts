import { TTimeframe } from '../../../../shared/types';

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

class BinanceHTTPClient {
  private static instance: BinanceHTTPClient;

  private readonly baseUrl = 'https://api.binance.com/api/v3';

  private constructor() {}

  /**
   * Форматирование данных о торговой паре
   * @param asset Данные о торговой паре
   * @returns Форматированные данные о торговой паре
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
   * @param stats Данные о статистике 24 часов
   * @returns Форматированные данные о статистике 24 часов
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
   * @param candle Данные о свече
   * @returns Форматированные данные о свече
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
   * @param symbol Символ торговой пары
   * @param trade Данные о сделке
   * @returns Форматированные данные о сделке
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
   * Запрос к API Binance
   * @param url URL запроса
   * @returns Данные ответа
   */
  private async request(url: string) {
    try {
      const response = await fetch(`${this.baseUrl}${url}`);
      if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status}, ${response.statusText}`;
        try {
          const text = await response.text();
          console.log('text', text);
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
   * @returns Экземпляр BinanceHTTPClient
   */
  public static getInstance(): BinanceHTTPClient {
    if (!BinanceHTTPClient.instance) {
      BinanceHTTPClient.instance = new BinanceHTTPClient();
    }
    return BinanceHTTPClient.instance;
  }

  /**
   * Получение списка всех торгуемых активов на Binance
   * @returns Массив объектов с информацией о торговых парах
   */
  public async fetchAssets(): Promise<TAsset[]> {
    try {
      const data = await this.request('/exchangeInfo');

      return data.symbols
        .filter((symbol: TAsset) => symbol.status === 'TRADING')
        .map(this.formatAsset);
    } catch (error) {
      console.error(`Ошибка при получении списка торгуемых активов: ${error}`);
      throw error;
    }
  }

  /**
   * Получение статистики 24 часов для всех торгуемых активов
   * @returns Массив объектов с информацией о торговых парах
   */
  public async getAssets24HrStats(): Promise<TAsset24HrStats[]> {
    try {
      const data = await this.request('/ticker/24hr');

      return data.map(this.format24HrStats);
    } catch (error) {
      console.error(`Ошибка при получении статистики 24 часов: ${error}`);
      throw error;
    }
  }

  /**
   * Получение информации о торговой паре
   * @param symbol Символ торговой пары (например, 'BTCUSDT')
   * @returns Информация о торговой паре
   */
  public async fetchAsset(symbol: string): Promise<TAsset> {
    try {
      const data = await this.request(`/exchangeInfo?symbol=${symbol}`);
      const foundAsset = data.symbols.find((item: TAsset) => item.symbol === symbol);

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
   * @param symbol Символ торговой пары (например, 'BTCUSDT')
   * @returns Текущая цена в виде строки
   */
  public async fetchAssetPrice(symbol: string): Promise<string> {
    try {
      const data = await this.request(`/ticker/price?symbol=${symbol}`);

      return data.price;
    } catch (error) {
      console.error(`Ошибка при получении текущей цены для ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Получение исторических свечей через REST API
   * @param symbol Символ торговой пары (например, 'BTCUSDT')
   * @param timeframe Интервал свечи ('1m', '5m', '15m', '1h', '1d' и т.д.)
   * @param limit Количество свечей
   * @param startTime Время начала (в миллисекундах)
   * @param endTime Время конца (в миллисекундах)
   * @returns Массив исторических свечей
   */
  public async fetchAssetCandles(
    symbol: string,
    timeframe: TTimeframe,
    limit: number,
    startTime?: number,
    endTime?: number,
  ): Promise<TCandle[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('symbol', symbol);
      queryParams.set('interval', timeframe);
      queryParams.set('limit', limit.toString());
      if (startTime) {
        queryParams.set('startTime', startTime.toString());
      }
      if (endTime) {
        queryParams.set('endTime', endTime.toString());
      }

      const data = await this.request(`/klines?${queryParams.toString()}`);

      return data.map(this.formatCandle);
    } catch (error) {
      console.error(`Ошибка при получении исторических свечей: ${error}`);
      throw error;
    }
  }

  /**
   * Получение исторических сделок для указанного символа
   * @param symbol Символ торговой пары (например, 'BTCUSDT')
   * @param limit Количество сделок
   * @param fromId Идентификатор сделки, с которой начинать получение
   * @param startTime Время начала (в миллисекундах)
   * @param endTime Время конца (в миллисекундах)
   * @returns Массив исторических сделок
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

      const data = await this.request(`/aggTrades?${queryParams.toString()}`);

      return data.map((trade: TRawTrade) => this.formatTrade(symbol, trade));
    } catch (error) {
      console.error(`Ошибка при получении исторических сделок: ${error}`);
      throw error;
    }
  }
}

export default BinanceHTTPClient;
export { TAsset, TAsset24HrStats, TCandle, TTrade };
