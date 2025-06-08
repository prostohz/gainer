import { useMutation, useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { TCorrelationReportFilters, TTimeframe } from '../../../shared/types';
import { http } from '../../shared/utils/http';
import { useLSState } from '../../shared/utils/localStorage';
import { Title } from '../../shared/utils/Title';
import { Loader } from '../../shared/ui/Loader';
import { DateTimePicker } from '../../shared/ui/Calendar';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { CorrelationClusters } from './CorrelationClusters';
import { CorrelationList } from './CorrelationList';
import { CorrelationHeatMap } from './CorrelationHeatMap';
import { Filters } from './Filters';

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
    'reportSelectedTimeFrame',
    '1m',
  );
  const [selectedDate, setSelectedDate] = useLSState<number>('reportSelectedDate', Date.now());

  const [filters, setFilters] = useLSState<TCorrelationReportFilters>('filters', {
    usdtOnly: false,
    ignoreUsdtUsdc: false,
    maxPValue: 0.9,
    maxHalfLife: 100,
    minVolume: 10_000_000,
  });

  const { data: hasReport, isLoading } = useQuery({
    queryKey: ['hasCorrelationReport', selectedTimeFrame],
    queryFn: () =>
      http
        .get('/api/correlationReport/has', {
          params: { timeframe: selectedTimeFrame },
        })
        .then((response) => response.data),
  });

  const { mutate: buildReport, isPending } = useMutation({
    mutationFn: () =>
      http.post('/api/correlationReport/build', null, {
        params: { timeframe: selectedTimeFrame, date: selectedDate },
      }),
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col flex-grow">
      <Title value={`Correlation Report (${selectedTimeFrame})`} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Correlation Report</h1>

        <div className="flex items-center gap-2">
          <DateTimePicker
            value={new Date(selectedDate)}
            onChange={(date) => setSelectedDate((date as Date).getTime())}
            className="min-w-56"
            placeholder="Select date"
          />

          <TimeframeSelector
            selectedTimeFrame={selectedTimeFrame}
            setSelectedTimeFrame={setSelectedTimeFrame}
          />

          <button className="btn btn-primary" disabled={isPending} onClick={() => buildReport()}>
            {isPending ? 'Building...' : hasReport ? 'Rebuild report' : 'Build report'}
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
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'hover:bg-base-300',
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </a>
            ))}
          </div>

          <div className="mb-4">
            <Filters values={filters} onChange={setFilters} />
          </div>

          <div className="flex flex-grow bg-base-200 rounded-lg p-4">
            {activeTab === 'list' && (
              <CorrelationList timeframe={selectedTimeFrame} filters={filters} />
            )}
            {activeTab === 'clusters' && (
              <CorrelationClusters timeframe={selectedTimeFrame} filters={filters} />
            )}
            {activeTab === 'heatmap' && (
              <CorrelationHeatMap timeframe={selectedTimeFrame} filters={filters} />
            )}
          </div>
        </>
      ) : (
        <div>No report found</div>
      )}
    </div>
  );
};
