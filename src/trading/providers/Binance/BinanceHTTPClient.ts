import { TKline, TTimeframe } from '../../types';

type TBinanceRawKline = [
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

type TFilter =
  | {
      filterType: 'PRICE_FILTER';
      tickSize: string;
    }
  | {
      filterType: 'LOT_SIZE';
      stepSize: string;
    };

type TExchangeInfoSymbol = {
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
  quoteOrderQtyMarketAllowed: boolean;
  allowTrailingStop: boolean;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  permissions: string[];
  filters: TFilter[];
};

type TAsset24HrStats = {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
};

class BinanceHTTPClient {
  private static instance: BinanceHTTPClient;

  private readonly baseUrl = 'https://api.binance.com/api/v3';

  private constructor() {}

  public static getInstance(): BinanceHTTPClient {
    if (!BinanceHTTPClient.instance) {
      BinanceHTTPClient.instance = new BinanceHTTPClient();
    }
    return BinanceHTTPClient.instance;
  }

  /**
   * Получение исторических свечей через REST API
   * @param symbol Символ торговой пары (например, 'BTCUSDT')
   * @param timeframe Интервал свечи ('1m', '5m', '15m', '1h', '1d' и т.д.)
   * @param limit Количество свечей (максимум 1000)
   * @returns Массив исторических свечей
   */
  public async fetchHistoricalKlines(
    symbol: string,
    timeframe: TTimeframe,
    limit: number,
  ): Promise<TKline[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      return data.map((kline: TBinanceRawKline) => ({
        openTime: kline[0],
        open: kline[1],
        high: kline[2],
        low: kline[3],
        close: kline[4],
        volume: kline[5],
        closeTime: kline[6],
        quoteAssetVolume: kline[7],
        numberOfTrades: kline[8],
        takerBuyBaseAssetVolume: kline[9],
        takerBuyQuoteAssetVolume: kline[10],
      }));
    } catch (error) {
      console.error(`Ошибка при получении исторических свечей: ${error}`);
      throw error;
    }
  }

  /**
   * Получение информации о торговой паре
   * @param symbol Символ торговой пары (например, 'BTCUSDT')
   * @returns Информация о торговой паре
   */
  public async fetchAssetInfo(symbol: string): Promise<TExchangeInfoSymbol> {
    try {
      const response = await fetch(`${this.baseUrl}/exchangeInfo?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, ${response.statusText}`);
      }

      const data = await response.json();

      return data.symbols.find((item: TExchangeInfoSymbol) => item.symbol === symbol);
    } catch (error) {
      console.error(`Ошибка при получении информации о торговой паре: ${error}`);
      throw error;
    }
  }

  /**
   * Получает текущую цену для указанного символа
   * @param symbol Символ торговой пары (например, 'BTCUSDT')
   * @returns Текущая цена в виде числа
   */
  public async fetchAssetPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/ticker/price?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      return parseFloat(data.price);
    } catch (error) {
      console.error(`Ошибка при получении текущей цены для ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Получение списка всех торгуемых активов на Binance
   * @returns Массив объектов с информацией о торговых парах
   */
  public async fetchAssetsTradable(): Promise<TExchangeInfoSymbol[]> {
    try {
      const response = await fetch(`${this.baseUrl}/exchangeInfo`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, ${response.statusText}`);
      }

      const data = await response.json();

      // Фильтруем только активные торговые пары
      return data.symbols.filter(
        (symbol: TExchangeInfoSymbol) => symbol.status === 'TRADING' && symbol.isSpotTradingAllowed,
      );
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
      const response = await fetch(`${this.baseUrl}/ticker/24hr`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Ошибка при получении статистики 24 часов: ${error}`);
      throw error;
    }
  }
}

export default BinanceHTTPClient;

export { TKline, TExchangeInfoSymbol, TAsset24HrStats, TFilter };
