export const measureTime = <T, A extends unknown[]>(
  label: string,
  fn: (...args: A) => Promise<T> | T,
  logger: (message: string) => void = console.log,
) => {
  return async (...args: A) => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;

      logger(`⏱️ ${label}: ${formatDuration(duration)}`);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      logger(`❌ ${label} (failed): ${formatDuration(duration)}`);
      throw error;
    }
  };
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }

  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(2);
  return `${minutes}m ${seconds}s`;
};
