import { useMutation, useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import http from '../../shared/http';
import { TCorrelationReport } from '../../../server/services/correlationService/types';
import { useLSState } from '../../shared/localStorage';
import { CorrelationMap } from './CorrelationMap';
import { CorrelationClusters } from './CorrelationClusters';

const TABS = [
  {
    id: 'heatmap',
    label: 'Heatmap',
  },
  {
    id: 'clusters',
    label: 'Clusters',
  },
] as const;

export const CorrelationReportPage = () => {
  const [activeTab, setActiveTab] = useLSState<'heatmap' | 'clusters'>('activeTab', 'heatmap');

  const {
    data: report,
    isLoading,
    refetch,
  } = useQuery<TCorrelationReport>({
    queryKey: ['correlationReport'],
    queryFn: () => http.get('/api/correlation/report').then((response) => response.data),
  });

  const { mutate: buildReport } = useMutation({
    mutationFn: () => http.post('/api/correlation/build').then(() => refetch()),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <div className="loading loading-ring loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Correlation Report</h1>

        <button className="btn btn-sm btn-primary" onClick={() => buildReport()}>
          {report ? 'Rebuild report' : 'Build report'}
        </button>
      </div>

      {report ? (
        <>
          <div role="tablist" className="mb-4 bg-base-200 rounded-lg p-1 inline-flex">
            {TABS.map((tab) => (
              <a
                role="tab"
                key={tab.id}
                className={cn(
                  'rounded-md font-medium transition-colors flex-grow flex items-center justify-center cursor-pointer h-8',
                  activeTab === tab.id
                    ? 'bg-secondary text-secondary-content shadow-sm'
                    : 'hover:bg-base-300',
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </a>
            ))}
          </div>

          {activeTab === 'heatmap' && <CorrelationMap report={report} />}
          {activeTab === 'clusters' && <CorrelationClusters report={report} />}
        </>
      ) : (
        <div>No report found</div>
      )}
    </div>
  );
};
