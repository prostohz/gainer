import { useState } from 'react';
import cn from 'classnames';

import { useQSState } from '../../shared/queryString';
import { AssetSelector } from '../../widgets/AssetSelector';
import { useAssets } from '../../entities/assets';
import { MetricsPane } from './MetricsPane';
import { BacktestPane } from './BacktestPane';

const TABS = [
  {
    id: 'Metrics',
    label: 'Metrics',
  },
  {
    id: 'Backtest',
    label: 'Backtest',
  },
] as const;

export const PairPage = () => {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('Metrics');
  const { assetList, isLoading: isAssetsLoading } = useAssets();

  const [symbolA, setSymbolA] = useQSState<string | null>('tickerA', null);
  const [symbolB, setSymbolB] = useQSState<string | null>('tickerB', null);

  return (
    <div className="flex-1 flex flex-col">
      <h1 className="text-2xl font-bold mb-4">
        {symbolA && symbolB ? (
          <span>
            Correlation Pair <span className="text-primary">{symbolA}</span> -{' '}
            <span className="text-primary">{symbolB}</span>
          </span>
        ) : (
          'Pair'
        )}
      </h1>

      <div className="flex flex-row gap-4 flex-1">
        <div className="flex gap-4 max-w-96 p-4 bg-base-200 rounded-lg">
          <AssetSelector
            isLoading={isAssetsLoading}
            assets={assetList}
            selectedAssetSymbol={symbolA}
            onAssetSelect={setSymbolA}
          />
          <AssetSelector
            isLoading={isAssetsLoading}
            assets={assetList}
            selectedAssetSymbol={symbolB}
            onAssetSelect={setSymbolB}
          />
        </div>

        <div className="flex flex-col gap-4 flex-grow">
          <div role="tablist" className="mb-2 bg-base-200 rounded-lg p-1 inline-flex">
            {TABS.map((tab) => (
              <a
                role="tab"
                key={tab.id}
                className={cn(
                  'rounded-md font-medium transition-colors flex-grow flex items-center justify-center cursor-pointer h-8',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'hover:bg-base-300',
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </a>
            ))}
          </div>

          {activeTab === 'Metrics' && <MetricsPane symbolA={symbolA} symbolB={symbolB} />}
          {activeTab === 'Backtest' && <BacktestPane symbolA={symbolA} symbolB={symbolB} />}
        </div>
      </div>
    </div>
  );
};
