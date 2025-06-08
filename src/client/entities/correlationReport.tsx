import { useQuery } from '@tanstack/react-query';

import {
  TTimeframe,
  TCorrelationReportFilters,
  TCorrelationReportList,
  TCorrelationReportMap,
} from '../../shared/types';
import { http } from '../shared/utils/http';

export const useCorrelationReportList = (
  timeframe: TTimeframe,
  filters: TCorrelationReportFilters,
) => {
  const {
    data: report,
    isLoading,
    error,
  } = useQuery<TCorrelationReportList>({
    queryKey: ['correlationReport', timeframe, filters],
    queryFn: () =>
      http
        .get('/api/correlationReport/list', { params: { timeframe, ...filters } })
        .then((response) => response.data),
  });

  return { report, isLoading, error };
};

export const useCorrelationReportMap = (
  timeframe: TTimeframe,
  filters: TCorrelationReportFilters,
) => {
  const {
    data: report,
    isLoading,
    error,
  } = useQuery<TCorrelationReportMap>({
    queryKey: ['correlationReport', timeframe, filters],
    queryFn: () =>
      http
        .get('/api/correlationReport/map', { params: { timeframe, ...filters } })
        .then((response) => response.data),
  });

  return { report, isLoading, error };
};
