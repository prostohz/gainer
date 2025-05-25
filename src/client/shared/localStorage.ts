import { useEffect, useState } from 'react';

const localStorageChangeEvent = 'localStorageChange';

const dispatchStorageEvent = (key: string, newValue: string | null) => {
  window.dispatchEvent(
    new CustomEvent(localStorageChangeEvent, {
      detail: { key, newValue },
    }),
  );
};

export const useLSState = <T>(key: string, defaultValue: T) => {
  const [state, setState] = useState<T>(() => {
    const lsValue = localStorage.getItem(key);
    return lsValue ? JSON.parse(lsValue) : defaultValue;
  });

  useEffect(() => {
    // Обработчик для событий из других вкладок
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setState(event.newValue ? JSON.parse(event.newValue) : defaultValue);
      }
    };

    // Обработчик для событий в текущей вкладке
    const handleLocalChange = (event: CustomEvent) => {
      const { key: eventKey, newValue } = event.detail;
      if (eventKey === key) {
        setState(newValue ? JSON.parse(newValue) : defaultValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(localStorageChangeEvent, handleLocalChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(localStorageChangeEvent, handleLocalChange as EventListener);
    };
  }, [key, defaultValue]);

  const setValue = (value: T) => {
    setState(value);
    const valueStr = JSON.stringify(value);
    localStorage.setItem(key, valueStr);
    dispatchStorageEvent(key, valueStr);
  };

  return [state, setValue] as const;
};
