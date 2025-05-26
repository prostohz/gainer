import { useMutation, useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { TTimeframe } from '../../../shared/types';
import { http } from '../../shared/http';
import { useLSState } from '../../shared/localStorage';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { CorrelationClusters } from './CorrelationClusters';
import { CorrelationList } from './CorrelationList';
import { CorrelationHeatMap } from './CorrelationHeatMap';

const TABS = [
  {
    id: 'list',
    label: 'List',
  },
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
  const [activeTab, setActiveTab] = useLSState<(typeof TABS)[number]['id']>('activeTab', 'list');
  const [selectedTimeFrame, setSelectedTimeFrame] = useLSState<TTimeframe>(
    'selectedTimeFrame',
    '1m',
  );

  const { data: hasReport, isLoading } = useQuery({
    queryKey: ['hasCorrelationReport', selectedTimeFrame],
    queryFn: () =>
      http
        .get('/api/correlationReport/has', { params: { timeframe: selectedTimeFrame } })
        .then((response) => response.data),
  });

  const { mutate: buildReport } = useMutation({
    mutationFn: () =>
      http.post('/api/correlationReport/build', null, {
        params: { timeframe: selectedTimeFrame },
      }),
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

        <div className="flex items-center gap-2">
          <TimeframeSelector
            selectedTimeFrame={selectedTimeFrame}
            setSelectedTimeFrame={setSelectedTimeFrame}
          />
          <button className="btn btn-sm btn-primary" onClick={() => buildReport()}>
            {hasReport ? 'Rebuild report' : 'Build report'}
          </button>
        </div>
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

          <div className="flex flex-grow bg-base-200 rounded-lg p-4">
            {activeTab === 'list' && <CorrelationList timeframe={selectedTimeFrame} />}
            {activeTab === 'clusters' && <CorrelationClusters timeframe={selectedTimeFrame} />}
            {activeTab === 'heatmap' && <CorrelationHeatMap timeframe={selectedTimeFrame} />}
          </div>
        </>
      ) : (
        <div>No report found</div>
      )}
    </div>
  );
};
