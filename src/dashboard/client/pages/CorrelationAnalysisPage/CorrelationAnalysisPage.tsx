import { useEffect, useState } from 'react';
import * as R from 'remeda';

import { AssetSelector } from '../../widgets/AssetSelector';
import { useAssets } from '../../entities/assets';
import { TCorrelation } from '../../../server/api/correlation/types';

export const CorrelationAnalysisPage = () => {
  const { assets } = useAssets();

  const [symbolA, setSymbolA] = useState<string | null>(null);
  const [symbolB, setSymbolB] = useState<string | null>(null);
  const [correlationData, setCorrelationData] = useState<TCorrelation | null>(null);

  useEffect(() => {
    if (!symbolA || !symbolB) return;

    fetch(`http://localhost:3001/api/correlation?symbolA=${symbolA}&symbolB=${symbolB}`)
      .then((response) => response.json())
      .then((data) => setCorrelationData(data));
  }, [assets, symbolA, symbolB]);

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
          <AssetSelector assets={assets} selectedAssetSymbol={symbolA} onAssetSelect={setSymbolA} />
          <AssetSelector assets={assets} selectedAssetSymbol={symbolB} onAssetSelect={setSymbolB} />
        </div>
      </div>
      <div className="p-4 bg-base-200 rounded-lg flex-grow">
        <h2 className="text-2xl font-bold mb-4">Correlation</h2>

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
