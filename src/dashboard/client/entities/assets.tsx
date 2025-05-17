import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TExchangeInfoSymbol } from '../../../trading/providers/Binance/BinanceHTTPClient';
import http from '../shared/http';

type AssetsContextType = {
  assets: TExchangeInfoSymbol[];
  isLoading: boolean;
  error: Error | null;
};

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export const AssetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data: assets = [],
    isLoading,
    error,
  } = useQuery<TExchangeInfoSymbol[]>({
    queryKey: ['assets'],
    queryFn: () => http.get('/api/assets').then((res) => res.data),
  });

  return (
    <AssetsContext.Provider
      value={{
        assets,
        isLoading,
        error,
      }}
    >
      {children}
    </AssetsContext.Provider>
  );
};

export const useAssets = (): AssetsContextType => {
  const context = useContext(AssetsContext);

  if (context === undefined) {
    throw new Error('useAssets must be used within an AssetsProvider');
  }

  return context;
};
