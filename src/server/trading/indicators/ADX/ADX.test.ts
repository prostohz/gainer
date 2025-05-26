import { ADX } from './ADX';
import { TIndicatorCandle } from '../types';

describe('ADX', () => {
  const createTestCandles = (): TIndicatorCandle[] => {
    // Создаем тестовые данные с трендом
    const candles: TIndicatorCandle[] = [];
    const basePrice = 100;

    for (let i = 0; i < 50; i++) {
      const trend = i * 0.5; // Восходящий тренд
      const volatility = Math.sin(i * 0.3) * 2; // Добавляем волатильность

      const open = basePrice + trend + volatility;
      const close = open + Math.random() * 2 - 1; // Случайное изменение
      const high = Math.max(open, close) + Math.random() * 1;
      const low = Math.min(open, close) - Math.random() * 1;

      candles.push({
        openTime: Date.now() + i * 60000,
        closeTime: Date.now() + (i + 1) * 60000 - 1,
        open,
        close,
        high,
        low,
        volume: 1000 + Math.random() * 500,
      });
    }

    return candles;
  };

  it('should calculate ADX correctly', () => {
    const adx = new ADX(14);
    const candles = createTestCandles();

    const result = adx.calculateADX(candles);

    expect(result).not.toBeNull();
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('should return null for insufficient data', () => {
    const adx = new ADX(14);
    const candles = createTestCandles().slice(0, 20); // Недостаточно данных

    const result = adx.calculateADX(candles);

    expect(result).toBeNull();
  });

  it('should calculate full ADX data', () => {
    const adx = new ADX(14);
    const candles = createTestCandles();

    const result = adx.calculateFullADX(candles);

    expect(result.adx).not.toBeNull();
    expect(result.diPlus).not.toBeNull();
    expect(result.diMinus).not.toBeNull();

    expect(typeof result.adx).toBe('number');
    expect(typeof result.diPlus).toBe('number');
    expect(typeof result.diMinus).toBe('number');
  });

  it('should calculate ADX series', () => {
    const adx = new ADX(14);
    const candles = createTestCandles();

    const series = adx.calculateADXSeries(candles);

    expect(series.length).toBeGreaterThan(0);
    expect(series[0]).toHaveProperty('timestamp');
    expect(series[0]).toHaveProperty('adx');
    expect(series[0]).toHaveProperty('diPlus');
    expect(series[0]).toHaveProperty('diMinus');
  });

  it('should determine trend strength correctly', () => {
    const adx = new ADX();

    expect(adx.getTrendStrength(10)).toBe('weak');
    expect(adx.getTrendStrength(30)).toBe('moderate');
    expect(adx.getTrendStrength(50)).toBe('strong');
    expect(adx.getTrendStrength(70)).toBe('very_strong');
  });

  it('should determine trend direction correctly', () => {
    const adx = new ADX();

    expect(adx.getTrendDirection(25, 15)).toBe('bullish');
    expect(adx.getTrendDirection(15, 25)).toBe('bearish');
    expect(adx.getTrendDirection(20, 22)).toBe('sideways');
  });
});
