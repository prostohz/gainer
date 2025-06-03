/**
 * Интерфейс для отслеживания лимитов API
 */
export type TRateLimit = {
  interval: string; // например, '1M', '1S', '1H', '1D'
  usedWeight: number;
  maxWeight?: number;
  resetTime?: number;
};

/**
 * Класс для управления лимитами API
 */
export class BinanceHTTPRateLimitManager {
  private rateLimits: Map<string, TRateLimit> = new Map();
  private readonly safetyMargin = 0.9; // Используем только 90% от лимита

  /**
   * Обновление информации о лимитах из заголовков ответа
   */
  public updateFromHeaders(headers: Headers): void {
    // Обновляем лимиты по весу запросов
    for (const [key, value] of headers.entries()) {
      if (key.startsWith('x-mbx-used-weight-')) {
        const interval = key.replace('x-mbx-used-weight-', '').toUpperCase();
        const usedWeight = parseInt(value, 10);

        this.rateLimits.set(interval, {
          interval,
          usedWeight,
          resetTime: Date.now() + this.getIntervalMs(interval),
        });
      }
    }
  }

  /**
   * Получение времени интервала в миллисекундах
   */
  private getIntervalMs(interval: string): number {
    const match = interval.match(/(\d+)([SMHD])/);
    if (!match) return 60000; // По умолчанию 1 минута

    const [, num, unit] = match;
    const multiplier = parseInt(num, 10);

    switch (unit) {
      case 'S':
        return multiplier * 1000;
      case 'M':
        return multiplier * 60 * 1000;
      case 'H':
        return multiplier * 60 * 60 * 1000;
      case 'D':
        return multiplier * 24 * 60 * 60 * 1000;
      default:
        return 60000;
    }
  }

  /**
   * Проверка, нужна ли задержка перед следующим запросом
   */
  public async waitIfNeeded(requestWeight: number): Promise<void> {
    const now = Date.now();

    this.cleanExpiredLimits(now);

    // Проверяем лимиты по весу - задерживаем только при приближении к лимитам
    for (const [interval, limit] of this.rateLimits) {
      if (limit.resetTime && limit.resetTime > now) {
        const estimatedWeight = limit.usedWeight + requestWeight;
        const maxSafeWeight = this.getMaxWeightForInterval(interval) * this.safetyMargin;

        if (estimatedWeight > maxSafeWeight) {
          const waitTime = limit.resetTime - now;
          console.log(`Приближение к лимиту API для интервала ${interval}. Ожидание ${waitTime}мс`);
          await this.sleep(waitTime); // Максимум 1 минута ожидания
          return;
        }
      }
    }
  }

  /**
   * Получение максимального веса для интервала (примерные значения на основе документации)
   */
  private getMaxWeightForInterval(interval: string): number {
    switch (interval) {
      case '1S':
        return 20; // 20 запросов в секунду
      case '1M':
        return 6000; // 6000 запросов в минуту
      case '1H':
        return 36000; // 36000 запросов в час
      case '1D':
        return 1600000; // 1.6M запросов в день
      default:
        throw new Error(`Unknown interval: ${interval}`);
    }
  }

  /**
   * Очистка устаревших лимитов
   */
  private cleanExpiredLimits(now: number): void {
    for (const [interval, limit] of this.rateLimits) {
      if (limit.resetTime && limit.resetTime <= now) {
        this.rateLimits.delete(interval);
      }
    }
  }

  /**
   * Задержка выполнения
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
