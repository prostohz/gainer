export type THistoricalKline = {
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
};

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
   * @param interval Интервал свечи ('1m', '5m', '15m', '1h', '1d' и т.д.)
   * @param limit Количество свечей (максимум 1000)
   * @returns Массив исторических свечей
   */
  public async fetchHistoricalKlines(
    symbol: string,
    interval: string,
    limit: number = 100,
  ): Promise<THistoricalKline[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
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
      return [];
    }
  }
}

export default BinanceHTTPClient;
