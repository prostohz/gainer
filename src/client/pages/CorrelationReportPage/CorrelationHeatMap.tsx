import { useQuery } from '@tanstack/react-query';

import { TCorrelationReport } from '../../../shared/types';
import { http } from '../../shared/http';
import { HeatMap } from '../../widgets/HeatMap';

export const CorrelationHeatMap = () => {
  const { data: report, isLoading } = useQuery<TCorrelationReport>({
    queryKey: ['correlationReport'],
    queryFn: () => http.get('/api/correlation/report').then((response) => response.data),
  });

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading loading-ring loading-lg" />;
    }

    if (!report) {
      return <div>No report found</div>;
    }

    return <HeatMap report={report} boundaries={{ bad: 0.3, moderate: 0.6, good: 0.9 }} />;
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow w-full">
      {renderContent()}
    </div>
  );
};
