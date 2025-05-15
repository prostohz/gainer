import { createContext, useContext, useEffect, useState } from 'react';
import { TExchangeInfoSymbol } from '../../../trading/providers/Binance/BinanceHTTPClient';

interface AssetsContextType {
  assets: TExchangeInfoSymbol[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export const AssetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<TExchangeInfoSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/assets');

      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return (
    <AssetsContext.Provider
      value={{
        assets,
        loading,
        error,
        refetch: fetchAssets,
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
