import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import * as R from 'remeda';

import { TKline, TTimeframe } from '../../../../trading/types';
import http from '../../shared/http';
import { useLSState } from '../../shared/localStorage';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { Chart } from '../../widgets/Chart';
import { useAssets } from '../../entities/assets';
import { CorrelationMap } from './CorrelationMap';

export const CorrelationClusterPage = () => {
  const { assetMap } = useAssets();
  const [searchParams] = useSearchParams();
  const symbolsParam = searchParams.get('symbols');

  const [timeframe, setTimeframe] = useLSState<TTimeframe>('clusterTimeframe', '1h');

  const symbols = symbolsParam ? symbolsParam.split(',') : [];

  const assetKlinesQueries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ['assetKlines', symbol, timeframe],
      queryFn: () =>
        http.get('/api/asset/klines', { params: { symbol, timeframe } }).then((res) => res.data),
    })),
  });

  const { data: assetZScore } = useQuery({
    queryKey: ['assetZScore', symbols, timeframe],
    queryFn: () =>
      http
        .get('/api/correlation/pairwiseZScore', { params: { symbols, timeframe } })
        .then((res) => res.data),
  });

  const assetKlines = useMemo(() => {
    if (!symbols.length) {
      return [];
    }
    if (!assetMap) {
      return [];
    }

    const assetKlineQueriesData = R.pipe(
      assetKlinesQueries,
      R.filter((query) => query.data),
      R.map((query) => query.data),
    ) as TKline[][];

    const assets = R.pipe(
      symbols,
      R.map((symbol) => assetMap[symbol]),
    );

    return R.pipe(
      R.zipWith(assets, assetKlineQueriesData, (asset, klines) => ({
        asset,
        klines,
      })),
    );
  }, [assetKlinesQueries, assetMap]);

  const renderCharts = () => {
    const isLoading = assetKlinesQueries.some((query) => query.isLoading);

    if (!symbols.length) {
      return <div>No symbols provided</div>;
    }

    if (isLoading) {
      return <div>Loading...</div>;
    }

    return (
      <div className="grid grid-cols-2 gap-4 w-full">
        {assetKlines.map(({ asset, klines }, index) => {
          return (
            <div key={index} className="flex flex-col gap-2">
              <div className="text-lg font-bold mb-2">{asset.symbol}</div>
              <div className="h-[300px]">
                <Chart klines={klines} precision={asset.precision} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center gap-2">
          <label className="font-medium block" htmlFor="timeFrameSelector">
            Timeframe
          </label>
          <div className="w-32">
            <TimeframeSelector selectedTimeFrame={timeframe} setSelectedTimeFrame={setTimeframe} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {/* {renderCharts()} */}
        <div className="bg-base-200 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-4">Correlation Graph</h2>
          {assetZScore && <CorrelationMap assetZScore={assetZScore} />}
        </div>
      </div>
    </div>
  );
};
