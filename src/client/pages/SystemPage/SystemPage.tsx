import { useQuery, useMutation } from '@tanstack/react-query';

import { dayjs } from '../../../shared/utils/daytime';
import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';
import { Loader } from '../../shared/ui/Loader';

export const SystemPage = () => {
  const { data: systemInfo, isLoading } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: () => http.get('/api/system').then((response) => response.data),
  });

  const { mutate: flushDatabase, isPending: isFlushDatabasePending } = useMutation({
    mutationFn: () => {
      return http.post('/api/system/flushDatabase');
    },
  });

  const { mutate: flushTrades, isPending: isFlushTradesPending } = useMutation({
    mutationFn: () => {
      return http.post('/api/system/flushTrades');
    },
  });

  const { mutate: loadCandles, isPending: isLoadCandlesPending } = useMutation({
    mutationFn: () => {
      return http.post('/api/system/loadCandles');
    },
  });

  return (
    <div className="flex flex-col ">
      <Title value="System" />

      <h1 className="text-2xl font-bold mb-4">System</h1>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col items-center gap-2 p-4 bg-base-200 rounded-lg">
          <span className="text-sm text-gray-400">Assets</span>
          <div className="h-10 flex items-center justify-center">
            {isLoading ? (
              <Loader />
            ) : (
              <span className="text-3xl font-bold">{systemInfo?.assetCount ?? 'N/A'}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 p-4 bg-base-200 rounded-lg">
          <span className="text-sm text-gray-400">First Candle</span>
          <div className="h-10 flex items-center justify-center">
            {isLoading ? (
              <Loader />
            ) : (
              <span className="text-lg font-semibold">
                {systemInfo?.firstCandleTime
                  ? dayjs(systemInfo.firstCandleTime).format('DD.MM.YYYY HH:mm')
                  : 'N/A'}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 p-4 bg-base-200 rounded-lg">
          <span className="text-sm text-gray-400">Last Candle</span>
          <div className="h-10 flex items-center justify-center">
            {isLoading ? (
              <Loader />
            ) : (
              <span className="text-lg font-semibold">
                {systemInfo?.lastCandleTime
                  ? dayjs(systemInfo.lastCandleTime).format('DD.MM.YYYY HH:mm')
                  : 'N/A'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-between">
        <div className="flex gap-4">
          <button
            className="btn btn-error"
            onClick={() => flushDatabase()}
            disabled={isFlushDatabasePending}
          >
            {isFlushDatabasePending ? 'Flushing...' : 'Flush Database'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => flushTrades()}
            disabled={isFlushTradesPending}
          >
            {isFlushTradesPending ? 'Flushing...' : 'Flush Trades'}
          </button>
        </div>

        <div className="flex gap-4">
          <button
            className="btn btn-secondary"
            onClick={() => loadCandles()}
            disabled={isLoadCandlesPending}
          >
            {isLoadCandlesPending ? 'Loading...' : 'Load Candles'}
          </button>
        </div>
      </div>
    </div>
  );
};
