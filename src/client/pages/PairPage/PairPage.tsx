import { useMemo } from 'react';
import cn from 'classnames';

import { useQSState } from '../../shared/utils/queryString';
import { useLSState } from '../../shared/utils/localStorage';
import { Title } from '../../shared/utils/Title';
import { AssetSelector } from '../../widgets/AssetSelector';
import { useAssets } from '../../entities/assets';
import { MetricsPane } from './metrics/MetricsPane';
import { BacktestPane } from './backtest/BacktestPane';

const TABS = [
  {
    id: 'metrics',
    label: 'Metrics',
  },
  {
    id: 'backtest',
    label: 'Backtest',
  },
] as const;

export const PairPage = () => {
  const [activeTab, setActiveTab] = useLSState<(typeof TABS)[number]['id']>(
    'pairActiveTab',
    'metrics',
  );
  const { assetList, isLoading: isAssetsLoading } = useAssets();

  const [symbolA, setSymbolA] = useQSState<string | null>('tickerA', null);
  const [symbolB, setSymbolB] = useQSState<string | null>('tickerB', null);

  const title = useMemo(() => {
    if (!symbolA || !symbolB) return 'Pair';
    return `Correlation Pair ${symbolA} - ${symbolB}`;
  }, [symbolA, symbolB]);

  return (
    <div className="flex-1 flex flex-col">
      <Title value={title} />

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

      <div className="flex gap-4 flex-1">
        <div className="flex gap-4 min-w-96 max-w-96 p-4 bg-base-200 rounded-lg">
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

          {activeTab === 'metrics' && <MetricsPane symbolA={symbolA} symbolB={symbolB} />}
          {activeTab === 'backtest' && <BacktestPane symbolA={symbolA} symbolB={symbolB} />}
        </div>
      </div>
    </div>
  );
};
