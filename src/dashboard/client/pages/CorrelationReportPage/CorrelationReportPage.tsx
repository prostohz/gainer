import { useMutation, useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import http from '../../shared/http';
import { useLSState } from '../../shared/localStorage';
import { Clusters } from './Clusters';
import { HeatMap } from './HeatMap';

const TABS = [
  {
    id: 'clusters',
    label: 'Clusters',
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
  },
] as const;

export const CorrelationReportPage = () => {
  const [activeTab, setActiveTab] = useLSState<(typeof TABS)[number]['id']>('activeTab', 'heatmap');

  const { data: hasReport, isLoading } = useQuery({
    queryKey: ['hasCorrelationReport'],
    queryFn: () => http.get('/api/correlation/report/has').then((response) => response.data),
  });

  const { mutate: buildReport } = useMutation({
    mutationFn: () => http.post('/api/correlation/report/build'),
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
          {hasReport ? 'Rebuild report' : 'Build report'}
        </button>
      </div>

      {hasReport ? (
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

          {activeTab === 'clusters' && <Clusters />}
          {activeTab === 'heatmap' && <HeatMap />}
        </>
      ) : (
        <div>No report found</div>
      )}
    </div>
  );
};
