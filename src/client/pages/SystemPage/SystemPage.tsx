import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';

export const SystemPage = () => {
  const { mutate: flushDatabase, isPending: isFlushDatabasePending } = useMutation({
    mutationFn: () => {
      return http.post('/api/system/flushDatabase');
    },
  });

  const { mutate: loadCandles, isPending: isLoadCandlesPending } = useMutation({
    mutationFn: () => {
      return http.post('/api/system/loadCandles');
    },
  });

  const { data: systemInfo } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: () => http.get('/api/system').then((response) => response.data),
  });

  return (
    <div className="flex flex-col ">
      <Title value="System" />

      <h1 className="text-2xl font-bold mb-4">System</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col items-center p-4 bg-base-200 rounded-lg">
          <span className="text-sm text-gray-400">Assets</span>
          <span className="text-3xl font-bold">{systemInfo?.assetCount ?? '—'}</span>
        </div>

        <div className="flex flex-col items-center p-4 bg-base-200 rounded-lg">
          <span className="text-sm text-gray-400">Last Candle</span>
          <span className="text-lg font-semibold">
            {systemInfo?.lastCandleTime
              ? dayjs(systemInfo.lastCandleTime).format('DD.MM.YYYY HH:mm')
              : 'N/A'}
          </span>
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <button
          className="btn btn-error"
          onClick={() => flushDatabase()}
          disabled={isFlushDatabasePending}
        >
          {isFlushDatabasePending ? 'Flushing...' : 'Flush Database'}
        </button>

        <button
          className="btn btn-success"
          onClick={() => loadCandles()}
          disabled={isLoadCandlesPending}
        >
          {isLoadCandlesPending ? 'Loading...' : 'Load Candles'}
        </button>
      </div>
    </div>
  );
};
