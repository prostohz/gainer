import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { TTimeframe } from '../../../shared/types';
import { http } from '../../shared/http';
import { useLSState } from '../../shared/localStorage';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { HeatMap } from '../../widgets/HeatMap';

export const CorrelationClusterPage = () => {
  const [searchParams] = useSearchParams();
  const symbolsParam = searchParams.get('symbols');

  const [timeframe, setTimeframe] = useLSState<TTimeframe>('clusterTimeframe', '1h');

  const symbols = symbolsParam ? symbolsParam.split(',') : [];

  const { data: assetZScore, isLoading } = useQuery({
    queryKey: ['assetZScore', symbols, timeframe],
    queryFn: () =>
      http
        .get('/api/correlation/pairwiseZScore', { params: { symbols, timeframe } })
        .then((res) => res.data),
    enabled: symbols.length > 0,
  });

  return (
    <div className="flex flex-col flex-grow">
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
      <div className="bg-base-200 rounded-lg p-4 flex flex-col flex-grow">
        <h2 className="text-lg font-bold mb-4">Z-Score Graph</h2>
        <div className="flex-grow flex justify-center items-center">
          {isLoading ? (
            <div className="loading loading-ring loading-lg" />
          ) : (
            <div className="w-full h-full">
              <HeatMap
                report={assetZScore}
                boundaries={[
                  { level: 0, color: 'bg-red-500' },
                  { level: 2, color: 'bg-orange-500' },
                  { level: 3, color: 'bg-yellow-500' },
                  { level: 4, color: 'bg-lime-500' },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
