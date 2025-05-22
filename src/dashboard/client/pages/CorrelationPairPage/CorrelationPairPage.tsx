import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TCandle, TTimeframe } from '../../../server/services/assetService/types';
import http from '../../shared/http';
import { useQSState } from '../../shared/queryString';
import { AssetSelector } from '../../widgets/AssetSelector';
import { TCorrelation } from '../../../server/services/correlationService/types';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { Chart } from '../../widgets/Chart';
import { useAssets } from '../../entities/assets';
import { Metrics } from './Metrics';
import { ZScoreHistory } from './ZScoreHistory';
import { Calculator } from './Calculator';

export const CorrelationPairPage = () => {
  const { assetList, assetMap, isLoading: isAssetsLoading } = useAssets();
  const [timeframe, setTimeframe] = useState<TTimeframe>('1m');

  const [symbolA, setSymbolA] = useQSState<string | null>('tickerA', null);
  const [symbolB, setSymbolB] = useQSState<string | null>('tickerB', null);

  const { data: pairCorrelation = null, isLoading } = useQuery<TCorrelation>({
    queryKey: ['pairCorrelation', symbolA, symbolB],
    queryFn: () =>
      http
        .get(`/api/correlation/pair?symbolA=${symbolA}&symbolB=${symbolB}`)
        .then((res) => res.data),
    enabled: Boolean(symbolA) && Boolean(symbolB),
  });

  const { data: assetACandles = null } = useQuery<TCandle[]>({
    queryKey: ['assetA', symbolA, timeframe],
    queryFn: () =>
      http
        .get(`/api/asset/candles?symbol=${symbolA}&timeframe=${timeframe}`)
        .then((res) => res.data),
    enabled: Boolean(symbolA) && Boolean(timeframe),
  });

  const { data: assetBCandles = null } = useQuery<TCandle[]>({
    queryKey: ['assetB', symbolB, timeframe],
    queryFn: () =>
      http
        .get(`/api/asset/candles?symbol=${symbolB}&timeframe=${timeframe}`)
        .then((res) => res.data),
    enabled: Boolean(symbolB) && Boolean(timeframe),
  });

  const { data: assetAPrice = null } = useQuery<number>({
    queryKey: ['assetAPrice', symbolA],
    queryFn: () => http.get(`/api/asset/price?symbol=${symbolA}`).then((res) => res.data),
    enabled: Boolean(symbolA),
  });

  const { data: assetBPrice = null } = useQuery<number>({
    queryKey: ['assetBPrice', symbolB],
    queryFn: () => http.get(`/api/asset/price?symbol=${symbolB}`).then((res) => res.data),
    enabled: Boolean(symbolB),
  });

  const assetA = symbolA ? assetMap[symbolA] : null;
  const assetB = symbolB ? assetMap[symbolB] : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        {symbolA && symbolB ? (
          <span>
            Correlation Pair <span className="text-primary">{symbolA}</span> -{' '}
            <span className="text-primary">{symbolB}</span>
          </span>
        ) : (
          'Correlation Pair'
        )}
      </h1>

      <div className="flex flex-row gap-4">
        <div className="p-4 bg-base-200 rounded-lg">
          <div className="flex flex-row gap-4 flex-grow min-w-96">
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
        </div>

        <div className="flex flex-col gap-4 flex-grow">
          {pairCorrelation && (
            <>
              <div className="p-4 bg-base-200 rounded-lg">
                <h2 className="text-lg font-bold mb-2">Calculator</h2>
                <div className="min-h-[180px]">
                  {assetAPrice && assetBPrice && assetA && assetB && (
                    <Calculator
                      longLastPrice={Number(assetBPrice).toFixed(assetB.precision)}
                      shortLastPrice={Number(assetAPrice).toFixed(assetA.precision)}
                    />
                  )}
                </div>
              </div>
              <div className="p-4 bg-base-200 rounded-lg">
                <h2 className="text-lg font-bold">Metrics</h2>
                <Metrics
                  correlation={pairCorrelation.correlation}
                  zScore={pairCorrelation.zScore}
                  cointegration={pairCorrelation.cointegration}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <label htmlFor="timeframe">Timeframe</label>
                <div className="w-32">
                  <TimeframeSelector
                    selectedTimeFrame={timeframe}
                    setSelectedTimeFrame={setTimeframe}
                  />
                </div>
              </div>
              <div className="p-4 bg-base-200 rounded-lg">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-bold mb-2">Z-Score History</h2>
                  <ZScoreHistory history={pairCorrelation.zScoreHistory[timeframe] || []} />
                </div>
              </div>
              <div className="p-4 bg-base-200 rounded-lg">
                <h2 className="text-lg font-bold mb-2">Asset charts</h2>
                {assetACandles && assetBCandles && assetA && assetB && (
                  <div className="flex gap-2">
                    <div className="flex-grow h-96 w-full">
                      <div className="font-semibold">{assetA.symbol}</div>
                      <Chart candles={assetACandles} precision={assetA.precision} />
                    </div>
                    <div className="flex-grow h-96 w-full">
                      <div className="font-semibold">{assetB.symbol}</div>
                      <Chart candles={assetBCandles} precision={assetB.precision} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!pairCorrelation && !isLoading && (
            <div className="p-4 bg-base-200 rounded-lg">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-md text-neutral-content">No assets selected</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
