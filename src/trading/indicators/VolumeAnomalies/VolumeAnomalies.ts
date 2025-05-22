import { TCandle, TTimeframe } from '../../types';
import { mean } from '../../utils/math';
import { TAnomalyCheck, TTradeBuffer } from './types';
import { timeframeToSeconds } from '../../utils/timeframe';

export default class VolumeAnomalies {
  private readonly RATIO_THRESHOLD = 10;

  private candles: TCandle[];
  private timeframeSeconds: number;
  private volumePerSecond: number;

  constructor(timeframe: TTimeframe, candles: TCandle[]) {
    this.candles = candles;
    this.timeframeSeconds = timeframeToSeconds(timeframe);
    this.volumePerSecond = mean(
      this.candles.map((candle) => parseFloat(candle.volume) / this.timeframeSeconds),
    );
  }

  /**
   * Проверяет, является ли объем сделки аномальным по сравнению с историческими данными
   */
  public checkAnomalyVolume(tradeBuffer: TTradeBuffer): TAnomalyCheck {
    const { trades, book, lastPrice } = tradeBuffer;

    const volume = trades.reduce((sum, t) => sum + parseFloat(t.q), 0);
    const ratio = volume / this.volumePerSecond;

    const lastTrade = tradeBuffer.trades[tradeBuffer.trades.length - 1];
    const lastTradePrice = parseFloat(lastTrade.p);

    const priceChange = (lastTradePrice - lastPrice) / lastPrice;

    const askPrice = book?.a;
    const bidPrice = book?.b;

    return {
      isAnomaly: ratio > this.RATIO_THRESHOLD,
      askPrice,
      bidPrice,
      lastPrice,
      lastTradePrice,
      priceChange,
    };
  }
}
