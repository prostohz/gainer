import { useQuery } from '@tanstack/react-query';

import {
  TTimeframe,
  TCorrelationReportClusters,
  TCorrelationReportFilters,
} from '../../../shared/types';
import { http } from '../../shared/http';
import { Loader } from '../../shared/ui/Loader';
import { setFavorites } from '../../widgets/AssetSelector';

type TProps = {
  timeframe: TTimeframe;
  filters: TCorrelationReportFilters;
};

export const CorrelationClusters = ({ timeframe, filters }: TProps) => {
  const { data: clusters, isLoading } = useQuery<TCorrelationReportClusters>({
    queryKey: ['correlationClusters', timeframe, filters],
    queryFn: () =>
      http
        .get('/api/correlationReport/clusters', {
          params: { timeframe, ...filters },
        })
        .then((response) => response.data),
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col flex-grow">
      {clusters && clusters.length > 0 ? (
        clusters.map((item, index) => (
          <div
            key={index}
            className="bg-base-300 rounded-lg p-4 mb-4 flex flex-row justify-between gap-4"
          >
            <div className="break-words">{item.join(', ')}</div>
            <div className="flex flex-row gap-2 shrink-0">
              <button className="btn btn-sm btn-primary" onClick={() => setFavorites(item)}>
                Set favorites
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center">No clusters</div>
      )}
    </div>
  );
};
