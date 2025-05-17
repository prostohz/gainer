import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as R from 'remeda';

import { AssetSelector } from '../../widgets/AssetSelector';
import { useAssets } from '../../entities/assets';
import { TCorrelation } from '../../../server/services/correlationService/types';
import http from '../../shared/http';
import { useSearchParams } from 'react-router-dom';

export const CorrelationPairPage = () => {
  const { assetList } = useAssets();
  const [searchParams] = useSearchParams();

  const [symbolA, setSymbolA] = useState<string | null>(searchParams.get('tickerA') || null);
  const [symbolB, setSymbolB] = useState<string | null>(searchParams.get('tickerB') || null);

  const { data: correlationData = null, isLoading } = useQuery<TCorrelation>({
    queryKey: ['correlation', symbolA, symbolB],
    queryFn: () =>
      http
        .get(`/api/correlation/pair?symbolA=${symbolA}&symbolB=${symbolB}`)
        .then((res) => res.data),
    enabled: Boolean(symbolA) && Boolean(symbolB),
  });

  const getCorrelationStyle = (correlation: number) => {
    const absCorrelation = Math.abs(correlation);

    if (absCorrelation < 0.3) {
      return { color: 'text-red-500', label: 'No correlation' };
    } else if (absCorrelation < 0.7) {
      return { color: 'text-yellow-500', label: 'Weak correlation' };
    } else {
      return { color: 'text-green-500', label: 'Strong correlation' };
    }
  };

  return (
    <div className="flex flex-row gap-4">
      <div className="p-4 bg-base-200 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Assets</h2>

        <div className="flex flex-row gap-4">
          <AssetSelector
            assets={assetList}
            selectedAssetSymbol={symbolA}
            onAssetSelect={setSymbolA}
          />
          <AssetSelector
            assets={assetList}
            selectedAssetSymbol={symbolB}
            onAssetSelect={setSymbolB}
          />
        </div>
      </div>
      <div className="p-4 bg-base-200 rounded-lg flex-grow">
        <h2 className="text-2xl font-bold mb-4">
          {symbolA && symbolB ? (
            <span>
              Correlation <span className="text-primary">{symbolA}</span> -{' '}
              <span className="text-primary">{symbolB}</span>
            </span>
          ) : (
            'Correlation'
          )}
        </h2>

        {isLoading && (
          <div className="flex justify-center items-center h-[500px]">
            <div className="loading loading-ring loading-lg"></div>
          </div>
        )}

        {correlationData && (
          <div className="border border-neutral rounded-lg p-4">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="font-bold">Timeframe</div>
              <div className="font-bold">Correlation</div>
              <div className="font-bold">Strength</div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-neutral py-2">
              <div>Overall</div>
              <div className={`font-bold ${getCorrelationStyle(correlationData.overall).color}`}>
                {correlationData.overall.toFixed(4)}
              </div>
              <div className="text-sm">{getCorrelationStyle(correlationData.overall).label}</div>
            </div>

            {R.entries(correlationData.timeframes).map(([timeframe, correlation]) => {
              const style = getCorrelationStyle(correlation);
              return (
                <div
                  key={timeframe}
                  className="grid grid-cols-3 gap-2 border-t border-neutral py-2"
                >
                  <div>{timeframe}</div>
                  <div className={`font-bold ${style.color}`}>{correlation.toFixed(4)}</div>
                  <div className="text-sm">{style.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
