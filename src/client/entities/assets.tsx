import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as R from 'remeda';

import { Asset } from '../../server/models/Asset';
import { http } from '../shared/http';

type AssetsContextType = {
  assetList: Asset[];
  assetMap: Record<string, Asset>;
  isLoading: boolean;
  error: Error | null;
};

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export const AssetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data: assetList = [],
    isLoading,
    error,
  } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => http.get('/api/asset/list').then((res) => res.data),
  });

  const assetMap = useMemo(() => {
    return R.indexBy(assetList, (asset) => asset.symbol);
  }, [assetList]);

  return (
    <AssetsContext.Provider
      value={{
        assetList,
        assetMap,
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
