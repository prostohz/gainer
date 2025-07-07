import { TMRReportPair } from '../../../shared/types';
import { timeframeToMilliseconds } from '../../utils/timeframe';
import {
  MAX_COINTEGRATION_P_VALUE,
  MIN_CORRELATION_BY_PRICES,
  MAX_CORRELATION_BY_PRICES,
  MIN_CORRELATION_BY_RETURNS,
  MAX_CORRELATION_BY_RETURNS,
  MIN_HALF_LIFE_DURATION_MS,
  MAX_HALF_LIFE_DURATION_MS,
  MIN_SPREAD_VOLATILITY_PERCENT,
  MAX_SPREAD_VOLATILITY_PERCENT,
} from './configs';

export const calculatePairScore = (pair: Omit<TMRReportPair, 'score'>) => {
  // Нормализация p-value коинтеграции (чем меньше, тем лучше)
  // pValue в диапазоне от 0 до MAX_COINTEGRATION_P_VALUE (0.01)
  const pValueScore = Math.max(
    0,
    (MAX_COINTEGRATION_P_VALUE - pair.pValue) / MAX_COINTEGRATION_P_VALUE,
  );

  // Нормализация halfLife (оптимальный диапазон)
  const minHalfLifeBars = Math.floor(MIN_HALF_LIFE_DURATION_MS / timeframeToMilliseconds('1m'));
  const maxHalfLifeBars = Math.ceil(MAX_HALF_LIFE_DURATION_MS / timeframeToMilliseconds('1m'));
  const optimalHalfLife = (minHalfLifeBars + maxHalfLifeBars) / 2;
  const halfLifeRange = maxHalfLifeBars - minHalfLifeBars;

  // Расстояние от оптимального значения
  const halfLifeDistance = Math.abs(pair.halfLife - optimalHalfLife);
  const halfLifeScore = Math.max(0, 1 - halfLifeDistance / (halfLifeRange / 2));

  // Нормализация корреляции по ценам
  const correlationByPricesScore =
    (pair.correlationByPrices - MIN_CORRELATION_BY_PRICES) /
    (MAX_CORRELATION_BY_PRICES - MIN_CORRELATION_BY_PRICES);

  // Нормализация корреляции по доходностям
  const correlationByReturnsScore =
    (pair.correlationByReturns - MIN_CORRELATION_BY_RETURNS) /
    (MAX_CORRELATION_BY_RETURNS - MIN_CORRELATION_BY_RETURNS);

  // Нормализация crossings (оптимальное значение - умеренное количество пересечений)
  // Слишком много или слишком мало пересечений плохо
  const optimalCrossings = 50; // Примерное оптимальное количество
  const crossingsDistance = Math.abs(pair.crossings - optimalCrossings);
  const crossingsScore = Math.max(0, 1 - crossingsDistance / optimalCrossings);

  // Нормализация волатильности спреда
  // Умеренная волатильность лучше - не слишком низкая, не слишком высокая
  const spreadStdScore = Math.max(
    0,
    Math.min(
      1,
      1 -
        Math.abs(
          pair.spread.std - (MIN_SPREAD_VOLATILITY_PERCENT + MAX_SPREAD_VOLATILITY_PERCENT) / 2,
        ) /
          ((MAX_SPREAD_VOLATILITY_PERCENT - MIN_SPREAD_VOLATILITY_PERCENT) / 2),
    ),
  );

  // Взвешенная сумма всех компонентов
  const weights = {
    pValue: 0.25, // Коинтеграция - очень важно
    halfLife: 0.2, // Период полураспада - важно для тайминга
    correlationByPrices: 0.2, // Корреляция по ценам - важно
    correlationByReturns: 0.15, // Корреляция по доходностям - важно
    crossings: 0.1, // Количество пересечений - менее важно
    spreadStd: 0.1, // Волатильность спреда - менее важно
  };

  const weightedScore =
    pValueScore * weights.pValue +
    halfLifeScore * weights.halfLife +
    correlationByPricesScore * weights.correlationByPrices +
    correlationByReturnsScore * weights.correlationByReturns +
    crossingsScore * weights.crossings +
    spreadStdScore * weights.spreadStd;

  // Нормализация на шкалу от 0 до 100
  const normalizedScore = Math.max(0, Math.min(100, weightedScore * 100));

  return Math.round(normalizedScore * 100) / 100; // Округление до 2 знаков после запятой
};
