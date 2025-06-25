export const measureTime = <T, A extends unknown[]>(
  label: string,
  fn: (...args: A) => Promise<T> | T,
) => {
  return async (...args: A) => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`⏱️  ${label}: ${formatDuration(duration)}`);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`❌ ${label} (failed): ${formatDuration(duration)}`);
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

// Decorator для методов класса
export const timeMethod = (label?: string) => {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodLabel = label || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: unknown[]) {
      return measureTime(methodLabel, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
};
