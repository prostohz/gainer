import { useMutation, useQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import * as R from 'remeda';
import cn from 'classnames';

import { TCompleteTrade } from '../../../server/trading/strategies/MeanReversionStrategy/backtest';
import { dayjs } from '../../../shared/utils/daytime';
import { http } from '../../shared/utils/http';
import { Loader } from '../../shared/ui/Loader';
import { TPairReport } from '../../../shared/types';
import { useLSState } from '../../shared/utils/localStorage';
import { DateTimePicker } from '../../shared/ui/Calendar';
import { Title } from '../../shared/utils/Title';
import { PairReportsHistogram } from './PairReportsHistogram';
import { PairReportsBacktestHistogram } from './PairReportsBacktestHistogram';

type TTableRowProps = {
  index: number;
  style: React.CSSProperties;
  data: {
    items: TPairReport[];
    updateReport: (id: string) => void;
    deleteReport: (id: string) => void;
    isUpdating: boolean;
    isDeleting: boolean;
  };
};

const TableRow: React.FC<TTableRowProps> = ({ index, style, data }) => {
  const item = data.items[index];

  const renderBacktestStats = (backtest: TCompleteTrade[] | null) => {
    if (!backtest) {
      return <span className="text-neutral-content">No data</span>;
    }

    const profitableTrades = backtest.filter((trade) => trade.roi > 0).length;
    const unprofitableTrades = backtest.filter((trade) => trade.roi <= 0).length;

    const winRate =
      backtest.length > 0 ? ((profitableTrades / backtest.length) * 100).toFixed(1) : '0.0';
    const totalProfitability = backtest.reduce((sum, trade) => sum + trade.roi, 0).toFixed(2);

    return (
      <div className="text-xs flex flex-col gap-1">
        <div>
          <span>{backtest.length} trades</span>
          {', '}
          <span className="text-success">{profitableTrades} profitable</span>
          {', '}
          <span className="text-error">{unprofitableTrades} unprofitable</span>
        </div>
        <div>
          <span>
            WinRate:{' '}
            <span
              className={cn(
                'font-medium',
                parseFloat(winRate) >= 50 ? 'text-success' : 'text-error',
              )}
            >
              {winRate}%
            </span>
          </span>
          {', '}
          <span>
            Total P&L:{' '}
            <span
              className={cn(
                'font-medium',
                parseFloat(totalProfitability) > 0 ? 'text-success' : 'text-error',
              )}
            >
              {totalProfitability}%
            </span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={style}
      className="flex items-center border-b border-base-300 hover:bg-base-300/50 px-4 hover:cursor-pointer"
      onClick={() => {
        window.open(`/pairReport/${item.id}`, '_blank');
      }}
    >
      <div className="w-40 flex-shrink-0">{item.id}</div>
      <div className="w-40 flex-shrink-0">{dayjs(item.date).format('DD.MM.YYYY HH:mm')}</div>
      <div className="w-20 flex-shrink-0">{item.data.length}</div>
      <div className="flex-1 min-w-0">{renderBacktestStats(item.backtest)}</div>
      <div className="flex-shrink-0 ml-4">
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-secondary btn-outline btn-sm"
            onClick={(event) => {
              event.stopPropagation();
              window.open(`/pairReport/${item.id}/backtest`, '_blank');
            }}
          >
            Backtest
          </button>

          <button
            className="btn btn-primary btn-outline btn-sm"
            onClick={(event) => {
              event.stopPropagation();
              data.updateReport(item.id);
            }}
            disabled={data.isUpdating}
          >
            {data.isUpdating ? 'Updating...' : 'Update'}
          </button>

          <button
            className="btn btn-error btn-sm btn-outline"
            onClick={(event) => {
              event.stopPropagation();
              data.deleteReport(item.id);
            }}
            disabled={data.isDeleting}
          >
            {data.isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PairReportListPage = () => {
  const [selectedDate, setSelectedDate] = useLSState<number>('reportSelectedDate', Date.now());

  const {
    data: pairReports,
    isLoading,
    refetch,
  } = useQuery<TPairReport[]>({
    queryKey: ['pairReportList'],
    queryFn: () => http.get('/api/pairReport').then((response) => response.data),
  });

  const { mutate: createReport, isPending } = useMutation({
    mutationFn: () =>
      http.post('/api/pairReport', null, {
        params: { date: selectedDate },
      }),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: updateReport, isPending: isUpdating } = useMutation({
    mutationFn: (id: string) => http.put(`/api/pairReport/${id}`),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: deleteReport, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => http.delete(`/api/pairReport/${id}`),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: backtestAllReports, isPending: isBacktesting } = useMutation({
    mutationFn: async () => {
      if (!pairReports) {
        return;
      }

      for (const report of pairReports) {
        if (report.backtest) {
          continue;
        }

        await http.post(`/api/pairReport/${report.id}/backtest`, {
          startTimestamp: report.date,
          endTimestamp: dayjs(report.date).add(30, 'minutes').valueOf(),
        });
      }
    },
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: createMissingReports } = useMutation({
    mutationFn: async () => {
      const existingReports = R.pipe(
        pairReports || [],
        R.map((report) => Number(report.date)),
      );

      if (existingReports.length < 2) {
        return;
      }

      const firstReportTime = existingReports.at(0)!;
      const lastReportTime = existingReports.at(-1)!;

      for (
        let date = firstReportTime;
        date < lastReportTime;
        date += dayjs.duration(1, 'hour').asMilliseconds()
      ) {
        if (existingReports.includes(date)) {
          continue;
        }

        await http.post('/api/pairReport', null, {
          params: {
            date,
          },
        });
      }

      backtestAllReports();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const downloadAllReports = () => {
    const reports = (pairReports || []).map((item) => ({
      id: item.id,
      date: dayjs(item.date).format('DD.MM.YYYY HH:mm'),
      pairs: item.data.length,
      backtest: item.backtest,
    }));

    const jsonContent = JSON.stringify(reports, null, 2);
    const blob = new Blob([jsonContent], { type: 'text/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports.json';
    a.click();
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col">
      <Title value="Pair Report" />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Pair Report</h1>

        <div className="flex gap-4 justify-between">
          <div className="flex">
            <DateTimePicker
              value={new Date(selectedDate)}
              onChange={(date) => setSelectedDate((date as Date).getTime())}
              placeholder="Select date"
              disabled={isPending}
            />
          </div>

          <div className="flex gap-2">
            <button className="btn btn-neutral" onClick={() => createMissingReports()}>
              Create Missing Reports
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => backtestAllReports()}
              disabled={isBacktesting}
            >
              {isBacktesting ? 'Backtesting...' : 'Backtest All Reports'}
            </button>

            <button
              className="btn btn-primary"
              onClick={() => createReport()}
              disabled={isBacktesting}
            >
              {isPending ? 'Creating...' : 'Create New Report'}
            </button>

            <button className="btn btn-outline" onClick={() => downloadAllReports()}>
              Download All Reports
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-base-200 rounded-lg flex flex-col gap-2 mb-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Distribution Of Pairs By Date</h3>
          <PairReportsHistogram pairReports={pairReports || []} />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Distribution Of Backtest By Date</h3>
          <PairReportsBacktestHistogram pairReports={pairReports || []} />
        </div>
      </div>

      <div className="bg-base-200 rounded-lg">
        {pairReports && pairReports.length > 0 ? (
          <>
            <div className="flex items-center bg-base-300 px-4 py-2 font-medium text-sm border-b border-base-300">
              <div className="w-40 flex-shrink-0">ID</div>
              <div className="w-40 flex-shrink-0">Date</div>
              <div className="w-20 flex-shrink-0">Pairs</div>
              <div className="flex-1 min-w-0">Backtest</div>
              <div className="flex-shrink-0 ml-4 text-right">Actions</div>
            </div>

            <div className="overflow-hidden">
              <List
                height={Math.min(600, pairReports.length * 80)}
                width="100%"
                itemCount={pairReports.length}
                itemSize={80}
                itemData={{
                  items: pairReports,
                  updateReport,
                  deleteReport,
                  isUpdating,
                  isDeleting,
                }}
              >
                {TableRow}
              </List>
            </div>
          </>
        ) : (
          <div className="text-center p-4">No reports found</div>
        )}
      </div>
    </div>
  );
};
