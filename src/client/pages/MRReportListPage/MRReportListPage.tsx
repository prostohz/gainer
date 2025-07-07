import { useMutation, useQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import * as R from 'remeda';
import cn from 'classnames';

import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';
import { dayjs } from '../../../shared/utils/daytime';
import { downloadFile } from '../../shared/utils/download';
import { http } from '../../shared/utils/http';
import { Loader } from '../../shared/ui/Loader';
import { TMRReport } from '../../../shared/types';
import { useLSState } from '../../shared/utils/localStorage';
import { DateTimePicker } from '../../shared/ui/Calendar';
import { Title } from '../../shared/utils/Title';
import { TagSelector } from '../../widgets/TagSelector';
import { BacktestStats } from '../../widgets/backtest/BacktestStats';
import { ReportsHistogram } from './ReportsHistogram';
import { ReportsBacktestHistogram } from './ReportsBacktestHistogram';
import { AverageRoiHistogram } from './AverageRoiHistogram';

type TTableRowProps = {
  index: number;
  style: React.CSSProperties;
  data: {
    items: TMRReport[];
    updateReport: (id: string) => void;
    deleteReport: (id: string) => void;
    isUpdating: boolean;
    isDeleting: boolean;
  };
};

const TableRow: React.FC<TTableRowProps> = ({ index, style, data }) => {
  const item = data.items[index];

  const renderBacktestStats = (backtestTrades: TCompleteTrade[] | null) => {
    if (!backtestTrades) {
      return <span className="text-neutral-content">No data to display</span>;
    }

    const profitableTrades = backtestTrades.filter((trade) => trade.roi > 0).length;
    const unprofitableTrades = backtestTrades.filter((trade) => trade.roi <= 0).length;

    const winRate =
      backtestTrades.length > 0
        ? ((profitableTrades / backtestTrades.length) * 100).toFixed(1)
        : '0.0';
    const totalProfitability = backtestTrades.reduce((sum, trade) => sum + trade.roi, 0).toFixed(2);

    return (
      <div className="text-xs flex flex-col gap-1">
        <div>
          <span>{backtestTrades.length} trades</span>
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
        window.open(`/mrReport/${item.id}`, '_blank');
      }}
    >
      <div className="w-40 flex-shrink-0">{item.id}</div>
      <div className="w-40 flex-shrink-0">{dayjs(item.date).format('DD.MM.YYYY HH:mm')}</div>
      <div className="w-20 flex-shrink-0">{item.pairsCount}</div>
      <div className="flex-1 min-w-0">{renderBacktestStats(item.backtestTrades)}</div>
      <div className="flex-shrink-0 ml-4">
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-secondary btn-outline btn-sm"
            onClick={(event) => {
              event.stopPropagation();
              window.open(`/mrReport/${item.id}/backtest`, '_blank');
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

export const MRReportListPage = () => {
  const [startDate, setStartDate] = useLSState<number | null>('reportsStartDate', null);
  const [endDate, setEndDate] = useLSState<number | null>('reportsEndDate', null);
  const [selectedTagId, setSelectedTagId] = useLSState<number | null>('reportsTagId', null);
  const [selectedDate, setSelectedDate] = useLSState<number>('reportSelectedDate', Date.now());

  const {
    data: reports,
    isLoading,
    refetch,
  } = useQuery<TMRReport[]>({
    queryKey: ['mrReportList', startDate, endDate, selectedTagId],
    queryFn: () =>
      http
        .get('/api/mrReport', {
          params: { startDate, endDate, tagId: selectedTagId },
        })
        .then((response) => response.data),
  });

  const { mutate: createReport, isPending } = useMutation({
    mutationFn: () =>
      http.post('/api/mrReport', null, {
        params: { date: selectedDate, tagId: selectedTagId },
      }),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: updateReport, isPending: isUpdating } = useMutation({
    mutationFn: (id: string) => http.put(`/api/mrReport/${id}`),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: deleteReport, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => http.delete(`/api/mrReport/${id}`),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: backtestAllReports, isPending: isBacktesting } = useMutation({
    mutationFn: async () => {
      if (!reports) {
        return;
      }

      for (const report of reports) {
        if (report.lastBacktestAt) {
          continue;
        }

        await http.post(`/api/mrReport/${report.id}/backtest`, {
          startTimestamp: report.date,
          endTimestamp: dayjs(report.date).add(1, 'hour').valueOf(),
        });
      }
    },
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: deleteAllBacktests, isPending: isDeletingAllBacktests } = useMutation({
    mutationFn: async () => {
      if (!reports) {
        return;
      }

      for (const report of reports) {
        if (report.lastBacktestAt) {
          await http.delete(`/api/mrReport/${report.id}/backtest`);
        }
      }
    },
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: deleteAllReports, isPending: isDeletingAllReports } = useMutation({
    mutationFn: async () => {
      if (!reports) {
        return;
      }

      for (const report of reports) {
        await http.delete(`/api/mrReport/${report.id}`);
      }
    },
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: createMissingReports } = useMutation({
    mutationFn: async () => {
      const existingReports = R.pipe(
        reports || [],
        R.map((report) => Number(report.date)),
      );
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

        await http.post('/api/mrReport', null, {
          params: {
            date,
            tagId: selectedTagId,
          },
        });
      }

      await refetch();
      await backtestAllReports();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const downloadAllReports = () => {
    const reportsToDownload = (reports || []).map((item) => ({
      id: item.id,
      date: dayjs(item.date).format('DD.MM.YYYY HH:mm'),
      pairs: item.pairsCount,
      backtestTrades: item.backtestTrades,
    }));

    const jsonContent = JSON.stringify(reportsToDownload, null, 2);
    downloadFile(jsonContent, 'reports.json');
  };

  if (isLoading) {
    return <Loader />;
  }

  const trades = reports?.flatMap((report) => report.backtestTrades || []) || [];

  return (
    <div className="flex flex-col">
      <Title value="Mean Reversion Reports" />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mean Reversion Reports</h1>

        <div className="flex gap-2">
          <DateTimePicker
            value={startDate ? new Date(startDate) : null}
            onChange={(date) => setStartDate((date as Date).getTime())}
            placeholder="Start Date"
          />
          <DateTimePicker
            value={endDate ? new Date(endDate) : null}
            onChange={(date) => setEndDate((date as Date).getTime())}
            placeholder="End Date"
          />

          <TagSelector value={selectedTagId} onChange={setSelectedTagId} />
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <DateTimePicker
            value={new Date(selectedDate)}
            onChange={(date) => setSelectedDate((date as Date).getTime())}
            placeholder="Select date"
            disabled={isPending}
          />

          <button className="btn btn-primary" onClick={() => createReport()} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Report'}
          </button>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => createMissingReports()}>
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
            className="btn btn-error"
            onClick={() => deleteAllBacktests()}
            disabled={isDeletingAllBacktests}
          >
            {isDeletingAllBacktests ? 'Deleting...' : 'Delete All Backtests'}
          </button>

          <button
            className="btn btn-error"
            onClick={() => deleteAllReports()}
            disabled={isDeletingAllReports}
          >
            {isDeletingAllReports ? 'Deleting...' : 'Delete All Reports'}
          </button>

          <button
            className="btn btn-outline btn-square"
            onClick={() => downloadAllReports()}
            title="Download All Reports"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </button>
        </div>
      </div>

      {reports && reports.length > 0 ? (
        <div className="flex flex-col gap-4 mb-4">
          <h2 className="text-lg font-semibold">Pairs count by date</h2>
          <ReportsHistogram reports={reports} />
          <h2 className="text-lg font-semibold">ROI by date</h2>
          <ReportsBacktestHistogram reports={reports} />
          <h2 className="text-lg font-semibold">Cumulative Average ROI</h2>
          <AverageRoiHistogram reports={reports} />
          <h2 className="text-lg font-semibold">Backtest Stats</h2>
          <div className="bg-base-200 rounded-lg p-4">
            <BacktestStats trades={trades} />
          </div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <div className="bg-base-200 rounded-lg">
            <div className="flex items-center px-4 py-3 font-medium text-sm border-b border-base-100">
              <div className="w-40 flex-shrink-0">ID</div>
              <div className="w-40 flex-shrink-0">Date</div>
              <div className="w-20 flex-shrink-0">Pairs</div>
              <div className="flex-1">Backtest</div>
              <div className="flex-shrink-0">Actions</div>
            </div>

            <div className="overflow-hidden">
              <List
                height={Math.min(600, reports.length * 80)}
                width="100%"
                itemCount={reports.length}
                itemSize={80}
                itemData={{
                  items: reports,
                  updateReport,
                  deleteReport,
                  isUpdating,
                  isDeleting,
                }}
              >
                {TableRow}
              </List>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-4">No reports found</div>
      )}
    </div>
  );
};
