import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { TTimeframe } from '../../../server/services/assetService/types';
import http from '../../shared/http';
import { useLSState } from '../../shared/localStorage';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { CorrelationMap } from './CorrelationMap';

export const CorrelationClusterPage = () => {
  const [searchParams] = useSearchParams();
  const symbolsParam = searchParams.get('symbols');

  const [timeframe, setTimeframe] = useLSState<TTimeframe>('clusterTimeframe', '1h');

  const symbols = symbolsParam ? symbolsParam.split(',') : [];

  const { data: assetZScore } = useQuery({
    queryKey: ['assetZScore', symbols, timeframe],
    queryFn: () =>
      http
        .get('/api/correlation/pairwiseZScore', { params: { symbols, timeframe } })
        .then((res) => res.data),
  });

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
        <div className="bg-base-200 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-4">Correlation Graph</h2>
          {assetZScore && <CorrelationMap assetZScore={assetZScore} />}
        </div>
      </div>
    </div>
  );
};
