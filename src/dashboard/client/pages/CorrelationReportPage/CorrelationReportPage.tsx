import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import http from '../../shared/http';
import { TCorrelation } from '../../../server/services/correlationService/types';
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
  const [usdtOnly, setUsdtOnly] = useLSState('usdtOnly', false);
  const [withVolume, setWithVolume] = useLSState('withVolume', false);
  const [minCorrelation, setMinCorrelation] = useLSState('minCorrelation', 0.9);

  const [activeTab, setActiveTab] = useLSState<'heatmap' | 'clusters'>('activeTab', 'heatmap');

  const {
    data: report,
    isLoading,
    refetch,
  } = useQuery<Record<string, TCorrelation | null>>({
    queryKey: ['correlationReport'],
    queryFn: () => http.get('/api/correlation/report').then((response) => response.data),
  });

  const { mutate: buildReport } = useMutation({
    mutationFn: () => http.post('/api/correlation/build').then(() => refetch()),
  });

  const filteredReport = useMemo(() => {
    if (!report) {
      return null;
    }

    if (!usdtOnly) {
      return report;
    }

    return Object.fromEntries(
      Object.entries(report).filter(([key]) => {
        const [symbolA, symbolB] = key.split('-');
        return symbolA.endsWith('USDT') && symbolB.endsWith('USDT');
      }),
    );
  }, [report, usdtOnly]);

  if (isLoading || !filteredReport) {
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
          {filteredReport ? 'Rebuild report' : 'Build report'}
        </button>
      </div>

      <div className="flex flex-row gap-8 items-center mb-4">
        <div className="flex flex-row gap-2 items-center">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={usdtOnly}
            onChange={() => setUsdtOnly(!usdtOnly)}
            id="usdtOnly"
          />
          <label className="text-sm" htmlFor="usdtOnly">
            USDT only
          </label>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={withVolume}
            onChange={() => setWithVolume(!withVolume)}
            id="withVolume"
          />
          <label className="text-sm" htmlFor="withVolume">
            With volume
          </label>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            className="input input-sm input-primary w-24"
            id="minCorrelation"
            value={minCorrelation}
            onChange={(e) => setMinCorrelation(Number(e.target.value))}
          />

          <label className="text-sm" htmlFor="minCorrelation">
            Min correlation
          </label>
        </div>
      </div>

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

      {activeTab === 'heatmap' && <CorrelationMap report={filteredReport} />}
      {activeTab === 'clusters' && (
        <CorrelationClusters report={filteredReport} minCorrelation={minCorrelation} />
      )}
    </div>
  );
};
