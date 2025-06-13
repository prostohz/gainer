import { useSearchParams } from 'react-router-dom';

export const useQSState = <T>(key: string, defaultValue: T) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = (searchParams.get(key) as T) || defaultValue;

  const setValue = (newValue: T) => {
    const updatedParams = new URLSearchParams(searchParams);
    updatedParams.set(key, String(newValue));
    setSearchParams(updatedParams);
  };

  return [value, setValue] as const;
};
