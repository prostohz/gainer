import _ from 'lodash';

import { TPriceLevelsTimeframe, TKline } from '../../types';

type TPriceLevelType = 'support' | 'resistance';

type TSupportLevel = {
  price: number;
  strength: number;
  type: TPriceLevelType;
};

type TExtremePoint = {
  price: number;
  volume: number;
  timestamp: number;
};

type TCluster = {
  prices: number[];
  volumes: number[];
  timestamps: number[];
};

export default class PriceLevels {
  // Размер окна при поиске экстремумов
  private static readonly EXTREME_POINTS_WINDOW_RATIO = 0.005;
  // Чувствительность алгоритма кластеризации - определяет, насколько близкими должны быть цены,
  // чтобы считаться одним уровнем поддержки/сопротивления (в % от ценового диапазона)
  private static readonly SENSITIVITY = 0.01;
  // Веса для разных таймфреймов при расчете уровней
  private static readonly TIMEFRAME_WEIGHTS: Record<TPriceLevelsTimeframe, number> = {
    '1m': 0.5,
    '15m': 0.8,
    '1h': 1.0,
    '4h': 1.2,
    '1d': 1.5,
  };

  /**
   * Находит экстремальные точки (локальные минимумы и максимумы) в исторических данных
   */
  private static findExtremePoints(
    prices: {
      low: number;
      high: number;
      close: number;
      open: number;
      volume: number;
      timestamp: number;
    }[],
  ): TExtremePoint[] {
    if (prices.length === 0) {
      return [];
    }

    // Определяем размер окна для поиска экстремумов (примерно 5% от общего количества свечей)
    const windowSize = Math.max(3, Math.floor(prices.length * this.EXTREME_POINTS_WINDOW_RATIO));

    const extremePoints: TExtremePoint[] = [];

    for (let i = windowSize; i < prices.length - windowSize; i++) {
      const currentWindow = prices.slice(i - windowSize, i + windowSize + 1);
      const currentPrice = prices[i];

      // Проверяем, является ли текущая свеча локальным минимумом (поддержка)
      const isSupport = currentWindow.every((p) => p.low >= currentPrice.low);

      // Проверяем, является ли текущая свеча локальным максимумом (сопротивление)
      const isResistance = currentWindow.every((p) => p.high <= currentPrice.high);

      if (isSupport) {
        extremePoints.push({
          price: currentPrice.low,
          volume: currentPrice.volume,
          timestamp: currentPrice.timestamp,
        });
      }

      if (isResistance) {
        extremePoints.push({
          price: currentPrice.high,
          volume: currentPrice.volume,
          timestamp: currentPrice.timestamp,
        });
      }
    }

    return extremePoints;
  }

  /**
   * Группирует близкие экстремумы в кластеры
   */
  private static clusterExtremePoints(
    extremePoints: TExtremePoint[],
    clusterThreshold: number,
  ): TCluster[] {
    const clusters: TCluster[] = [];

    const sortedPoints = [...extremePoints].sort((a, b) => a.price - b.price);

    for (const point of sortedPoints) {
      let foundCluster = false;

      for (const cluster of clusters) {
        // Проверяем, близка ли точка к среднему значению кластера и того же типа
        const clusterAvgPrice =
          cluster.prices.reduce((sum, p) => sum + p, 0) / cluster.prices.length;

        if (Math.abs(point.price - clusterAvgPrice) <= clusterThreshold) {
          // Добавляем точку в существующий кластер
          cluster.prices.push(point.price);
          cluster.volumes.push(point.volume);
          cluster.timestamps.push(point.timestamp);
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push({
          prices: [point.price],
          volumes: [point.volume],
          timestamps: [point.timestamp],
        });
      }
    }

    return clusters;
  }

  /**
   * Рассчитывает уровни поддержки и сопротивления на основе исторических свечей
   */
  private static calculatePriceLevels(
    timeframeKlinesMap: Record<TPriceLevelsTimeframe, TKline[]>,
  ): TSupportLevel[] {
    if (Object.keys(timeframeKlinesMap).length === 0) {
      return [];
    }

    // Объединяем экстремальные точки со всех таймфреймов
    const allExtremePrices: TExtremePoint[] = [];
    const timeframeWeights = this.TIMEFRAME_WEIGHTS;

    // Находим минимальную и максимальную цены по всем таймфреймам
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const [timeframe, klines] of Object.entries(timeframeKlinesMap) as [
      TPriceLevelsTimeframe,
      TKline[],
    ][]) {
      if (klines.length === 0) continue;

      const prices = klines.map((kline) => ({
        low: parseFloat(kline.low),
        high: parseFloat(kline.high),
        close: parseFloat(kline.close),
        open: parseFloat(kline.open),
        volume: parseFloat(kline.volume),
        timestamp: kline.openTime,
      }));

      // Обновляем минимум и максимум
      const timeframeMin = Math.min(...prices.map((p) => p.low));
      const timeframeMax = Math.max(...prices.map((p) => p.high));
      minPrice = Math.min(minPrice, timeframeMin);
      maxPrice = Math.max(maxPrice, timeframeMax);

      // Находим экстремальные точки для текущего таймфрейма
      const extremePoints = this.findExtremePoints(prices);

      // Добавляем вес таймфрейма к каждой точке
      extremePoints.forEach((point) => {
        allExtremePrices.push({
          ...point,
          volume: point.volume * (timeframeWeights[timeframe] || 1), // Применяем вес таймфрейма
        });
      });
    }

    if (allExtremePrices.length === 0) {
      return [];
    }

    const priceRange = maxPrice - minPrice;

    // Группируем близкие экстремумы в кластеры
    const clusterThreshold = priceRange * this.SENSITIVITY;
    const clusters = this.clusterExtremePoints(allExtremePrices, clusterThreshold);

    // Берем последние свечи для определения текущей цены
    // Используем самый короткий таймфрейм для более точного определения текущей цены
    const shortestTimeframe = Object.keys(timeframeKlinesMap).sort()[0] as TPriceLevelsTimeframe;
    const latestKlines = timeframeKlinesMap[shortestTimeframe];
    const currentPrice = parseFloat(latestKlines[latestKlines.length - 1].close);

    // Преобразуем кластеры в уровни поддержки/сопротивления
    const levels = clusters.map((cluster) => {
      const averagePrice = cluster.prices.reduce((sum, p) => sum + p, 0) / cluster.prices.length;
      const totalVolume = cluster.volumes.reduce((sum, v) => sum + v, 0);

      // Рассчитываем силу уровня
      const countFactor = cluster.prices.length * (1 + Math.log(cluster.prices.length));
      const volumeFactor = totalVolume / cluster.prices.length;
      const rawStrength = countFactor * (1 + volumeFactor);

      // Определяем тип уровня
      let type: TPriceLevelType = 'resistance';
      if (currentPrice > averagePrice) {
        type = 'support';
      }

      return {
        price: averagePrice,
        strength: rawStrength,
        type,
      };
    });

    // Нормализуем силу уровней
    if (levels.length > 0) {
      const maxStrength = Math.max(...levels.map((level) => level.strength));
      const minStrength = Math.min(...levels.map((level) => level.strength));

      if (maxStrength > minStrength) {
        levels.forEach((level) => {
          level.strength = Math.round(
            ((level.strength - minStrength) / (maxStrength - minStrength)) * 100,
          );
        });
      } else {
        levels.forEach((level) => {
          level.strength = 50;
        });
      }
    }

    return levels;
  }

  /**
   * Рассчитывает уровни поддержки на основе исторических свечей
   */
  public static calculateSupportLevels(
    timeframeKlinesMap: Record<TPriceLevelsTimeframe, TKline[]>,
  ) {
    const levels = this.calculatePriceLevels(timeframeKlinesMap);

    return levels
      .filter((level) => level.type === 'support')
      .map((level) => _.pick(level, ['price', 'strength']));
  }

  /**
   * Рассчитывает уровни сопротивления на основе исторических свечей
   */
  public static calculateResistanceLevels(
    timeframeKlinesMap: Record<TPriceLevelsTimeframe, TKline[]>,
  ) {
    const levels = this.calculatePriceLevels(timeframeKlinesMap);

    return levels
      .filter((level) => level.type === 'resistance')
      .map((level) => _.pick(level, ['price', 'strength']));
  }
}
