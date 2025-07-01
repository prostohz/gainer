import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { dayjs } from '../../../shared/utils/daytime';
import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';
import { Loader } from '../../shared/ui/Loader';
import { DateTimePicker } from '../../shared/ui/Calendar';

interface TimeframeCandlesInfo {
  first: string | null;
  last: string | null;
}

interface SystemInfo {
  assetCount: number;
  timeframeCandles: Record<string, TimeframeCandlesInfo>;
}

export const SystemPage = () => {
  const [initialDate, setInitialDate] = useState<Date | null>(null);

  const { data: systemInfo, isLoading } = useQuery<SystemInfo>({
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
    mutationFn: (initialDate?: Date | null) => {
      const payload = initialDate ? { initialDate: initialDate.valueOf() } : {};
      return http.post('/api/system/loadCandles', payload);
    },
  });

  return (
    <div className="flex flex-col">
      <Title value="System" />

      <h1 className="text-2xl font-bold mb-6">System Information</h1>

      <div className="mb-6">
        <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
          <span className="text-lg font-medium">Total Assets</span>
          <div className="flex items-center">
            {isLoading ? (
              <Loader />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {systemInfo?.assetCount ?? 'N/A'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 bg-base-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Candle Data by Timeframe</h2>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th className="text-left text-sm">Timeframe</th>
                  <th className="text-left text-sm">First Candle</th>
                  <th className="text-left text-sm">Last Candle</th>
                  <th className="text-right text-sm">Data Range</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(systemInfo?.timeframeCandles ?? {}).map(
                  ([timeframe, candleInfo]) => {
                    const firstDate = candleInfo.first ? dayjs(candleInfo.first) : null;
                    const lastDate = candleInfo.last ? dayjs(candleInfo.last) : null;
                    const daysDiff = firstDate && lastDate ? lastDate.diff(firstDate, 'day') : null;

                    return (
                      <tr key={timeframe}>
                        <td>
                          <span className="badge badge-outline font-mono text-sm">{timeframe}</span>
                        </td>
                        <td>
                          {firstDate ? (
                            <div>
                              <div className="font-medium">{firstDate.format('DD.MM.YYYY')}</div>
                              <div className="text-sm text-gray-500">
                                {firstDate.format('HH:mm:ss')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td>
                          {lastDate ? (
                            <div>
                              <div className="font-medium">{lastDate.format('DD.MM.YYYY')}</div>
                              <div className="text-sm text-gray-500">
                                {lastDate.format('HH:mm:ss')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="text-right">
                          {daysDiff !== null ? (
                            <div>
                              <div className="font-medium">{daysDiff} days</div>
                              <div className="text-sm text-gray-500">
                                {Math.round(daysDiff / 30)} months
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
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

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col gap-2">
            <DateTimePicker
              value={initialDate}
              onChange={(date) => setInitialDate(date as Date | null)}
              placeholder="Select initial date"
            />
          </div>

          <button
            className="btn btn-primary self-end"
            onClick={() => loadCandles(initialDate)}
            disabled={isLoadCandlesPending}
          >
            {isLoadCandlesPending ? 'Loading...' : 'Load Candles'}
          </button>
        </div>
      </div>
    </div>
  );
};
