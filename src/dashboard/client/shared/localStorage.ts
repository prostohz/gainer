export const getLocalStorageProvider = <T>(key: string, defaultValue: T) => {
  const getValue = (): T => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  };

  const setValue = (value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  return {
    getValue,
    setValue,
  };
};
