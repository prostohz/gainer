interface PerformanceStats {
  totalTime: number;
  calls: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
}

export class PerformanceTracker {
  private performanceStats: Record<string, PerformanceStats> = {};

  /**
   * Создает обертку для функции, которая измеряет время ее выполнения
   */
  measureTime<T extends unknown[], R>(funcName: string, fn: (...args: T) => R): (...args: T) => R {
    return (...args: T): R => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();

      this.recordTime(funcName, end - start);

      return result;
    };
  }

  /**
   * Записывает время выполнения для указанной функции
   */
  private recordTime(funcName: string, duration: number): void {
    if (!this.performanceStats[funcName]) {
      this.performanceStats[funcName] = {
        totalTime: 0,
        calls: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
      };
    }

    const stats = this.performanceStats[funcName];
    stats.totalTime += duration;
    stats.calls += 1;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.avgTime = stats.totalTime / stats.calls;
  }

  /**
   * Выводит статистику производительности в консоль
   */
  printStats(title: string = 'СТАТИСТИКА ВРЕМЕНИ ВЫПОЛНЕНИЯ ФУНКЦИЙ'): void {
    console.log(`\n=== ${title} ===`);
    console.log(
      '┌─────────────────────────┬──────────┬─────────────┬─────────────┬─────────────┬─────────────┐',
    );
    console.log(
      '│ Функция                 │ Вызовов  │ Общее (мс)  │ Мин (мс)    │ Макс (мс)   │ Сред (мс)   │',
    );
    console.log(
      '├─────────────────────────┼──────────┼─────────────┼─────────────┼─────────────┼─────────────┤',
    );

    for (const [funcName, stats] of Object.entries(this.performanceStats)) {
      const name = funcName.padEnd(23);
      const calls = stats.calls.toString().padStart(8);
      const total = stats.totalTime.toFixed(2).padStart(11);
      const min = stats.minTime.toFixed(2).padStart(11);
      const max = stats.maxTime.toFixed(2).padStart(11);
      const avg = stats.avgTime.toFixed(2).padStart(11);

      console.log(`│ ${name} │ ${calls} │ ${total} │ ${min} │ ${max} │ ${avg} │`);
    }

    console.log(
      '└─────────────────────────┴──────────┴─────────────┴─────────────┴─────────────┴─────────────┘',
    );

    const totalTime = Object.values(this.performanceStats).reduce(
      (sum, stats) => sum + stats.totalTime,
      0,
    );
    const totalCalls = Object.values(this.performanceStats).reduce(
      (sum, stats) => sum + stats.calls,
      0,
    );

    console.log(`\nИтого: ${totalCalls} вызовов, ${totalTime.toFixed(2)} мс общего времени`);
  }

  /**
   * Получает статистику для указанной функции
   */
  getStats(funcName: string): PerformanceStats | null {
    return this.performanceStats[funcName] || null;
  }

  /**
   * Получает всю статистику
   */
  getAllStats(): Record<string, PerformanceStats> {
    return { ...this.performanceStats };
  }

  /**
   * Очищает всю статистику
   */
  clearStats(): void {
    this.performanceStats = {};
  }

  /**
   * Очищает статистику для указанной функции
   */
  clearFunctionStats(funcName: string): void {
    delete this.performanceStats[funcName];
  }
}
