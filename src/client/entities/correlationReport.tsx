import { useQuery } from '@tanstack/react-query';

import { TTimeframe, TCorrelationReport } from '../../shared/types';
import { http } from '../shared/http';

export const useCorrelationReport = (timeframe: TTimeframe) => {
  const {
    data: report,
    isLoading,
    error,
  } = useQuery<TCorrelationReport>({
    queryKey: ['correlationReport', timeframe],
    queryFn: () =>
      http
        .get('/api/correlationReport', { params: { timeframe } })
        .then((response) => response.data),
  });

  return { report, isLoading, error };
};
