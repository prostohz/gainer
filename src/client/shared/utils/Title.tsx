import { useEffect } from 'react';

export const Title = ({ value }: { value: string }) => {
  useEffect(() => {
    document.title = value;
  }, [value]);

  return null;
};
