import { THistoricalKline } from '../providers/Binance/BinanceHTTPClient';
import { roundTo } from '../utils/math';

type TSupportLevel = {
  price: number;
  strength: number;
};

export default class PriceLevels {
  /**
   * Рассчитывает уровни поддержки на основе исторических свечей
   * с учетом объема торгов
   */
  private static calculatePriceLevels(
    klines: THistoricalKline[],
    precision: number,
  ): TSupportLevel[] {
    return [];
  }

  public static calculateSupportLevels(
    klines: THistoricalKline[],
    precision: number,
    currentPrice: number,
  ): TSupportLevel[] {
    return PriceLevels.calculatePriceLevels(klines, precision).filter(
      (level) => level.price < currentPrice,
    );
  }

  public static calculateResistanceLevels(
    klines: THistoricalKline[],
    precision: number,
    currentPrice: number,
  ): TSupportLevel[] {
    return PriceLevels.calculatePriceLevels(klines, precision).filter(
      (level) => level.price > currentPrice,
    );
  }
}
