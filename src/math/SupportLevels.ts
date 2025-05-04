import { THistoricalKline } from '../providers/Binance/BinanceHTTPClient';

type TSupportLevel = {
  price: number;
  strength: number;
};

export default class SupportLevels {
  /**
   * Рассчитывает уровни поддержки на основе исторических свечей
   * @param klines Массив исторических свечей
   * @param sensitivity Чувствительность для определения уровней (меньше = больше уровней)
   * @returns Массив уровней поддержки, отсортированный по силе (от большей к меньшей)
   */
  public static calculateSupportLevels(
    klines: THistoricalKline[],
    sensitivity: number = 0.005,
  ): TSupportLevel[] {
    // Преобразуем строковые цены в числа
    const prices = klines.map((kline) => ({
      low: parseFloat(kline.low),
      high: parseFloat(kline.high),
      close: parseFloat(kline.close),
    }));

    // Находим минимальную и максимальную цены для определения диапазона
    const minPrice = Math.min(...prices.map((p) => p.low));
    const maxPrice = Math.max(...prices.map((p) => p.high));
    const priceRange = maxPrice - minPrice;

    // Определяем шаг для группировки цен
    const step = priceRange * sensitivity;

    // Создаем карту для подсчета частоты появления цен в определенных диапазонах
    const priceFrequency: Map<number, number> = new Map();

    // Подсчитываем, сколько раз цена находилась в каждом диапазоне
    prices.forEach((price) => {
      // Проверяем минимумы (уровни поддержки)
      const lowBucket = Math.floor(price.low / step) * step;
      priceFrequency.set(lowBucket, (priceFrequency.get(lowBucket) || 0) + 1);

      // Также учитываем цены закрытия, так как они тоже важны
      const closeBucket = Math.floor(price.close / step) * step;
      priceFrequency.set(closeBucket, (priceFrequency.get(closeBucket) || 0) + 1);
    });

    // Преобразуем карту в массив уровней поддержки
    const supportLevels: TSupportLevel[] = Array.from(priceFrequency.entries())
      .map(([price, count]) => ({
        price,
        strength: count,
      }))
      .sort((a, b) => b.strength - a.strength); // Сортируем по убыванию силы

    // Возвращаем только значимые уровни (например, верхние 30%)
    const significantLevelsCount = Math.max(3, Math.ceil(supportLevels.length * 0.3));
    return supportLevels.slice(0, significantLevelsCount);
  }
}
