import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as R from 'remeda';

import { TAsset } from '../../../dashboard/server/services/assetsService/types';
import http from '../shared/http';

type AssetsContextType = {
  assetList: TAsset[];
  assetMap: Record<string, TAsset>;
  isLoading: boolean;
  error: Error | null;
};

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export const AssetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data: assetList = [],
    isLoading,
    error,
  } = useQuery<TAsset[]>({
    queryKey: ['assets'],
    queryFn: () => http.get('/api/assets').then((res) => res.data),
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
