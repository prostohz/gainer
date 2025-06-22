import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as R from 'remeda';
import { FixedSizeList as List } from 'react-window';

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
    renderBacktestStats: (backtest: TCompleteTrade[] | null) => React.ReactNode;
  };
};

const TableRow: React.FC<TTableRowProps> = ({ index, style, data }) => {
  const item = data.items[index];

  return (
    <div
      style={style}
      className="flex items-center border-b border-base-300 hover:bg-base-300/50 px-4"
    >
      <div className="w-40 flex-shrink-0">{item.id}</div>
      <div className="w-40 flex-shrink-0">
        <Link className="text-primary hover:text-primary-focus" to={`/pairReport/${item.id}`}>
          {dayjs(item.date).format('DD.MM.YYYY HH:mm')}
        </Link>
      </div>
      <div className="w-20 flex-shrink-0">{item.data.length}</div>
      <div className="flex-1 min-w-0">{data.renderBacktestStats(item.backtest)}</div>
      <div className="flex-shrink-0 ml-4">
        <div className="flex gap-2 justify-end">
          <Link
            className="btn btn-secondary btn-outline btn-sm"
            to={`/pairReport/${item.id}/backtest`}
          >
            Backtest
          </Link>

          <button
            className="btn btn-primary btn-outline btn-sm"
            onClick={() => data.updateReport(item.id)}
            disabled={data.isUpdating}
          >
            {data.isUpdating ? 'Updating...' : 'Update'}
          </button>

          <button
            className="btn btn-error btn-sm btn-outline"
            onClick={() => data.deleteReport(item.id)}
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
      <div className="text-sm">
        <div>{backtest.length} trades</div>
        <div className="text-xs">
          <span className="text-success">{profitableTrades} profitable</span>
          {', '}
          <span className="text-error">{unprofitableTrades} unprofitable</span>
        </div>
        <div className="text-xs mt-1">
          <div>
            WinRate: <span className="font-medium">{winRate}%</span>
          </div>
          <div>
            Total P&L:{' '}
            <span
              className={`font-medium ${parseFloat(totalProfitability) >= 0 ? 'text-success' : 'text-error'}`}
            >
              {totalProfitability}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col">
      <Title value="Pair Report" />

      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">Pair Report</h1>
      </div>

      <div className="flex gap-2 justify-between mb-4">
        <div className="flex">
          <DateTimePicker
            value={new Date(selectedDate)}
            onChange={(date) => setSelectedDate((date as Date).getTime())}
            className="min-w-56"
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

      <div className="flex flex-col gap-4 mb-4">
        <PairReportsHistogram pairReports={pairReports || []} />
        <PairReportsBacktestHistogram pairReports={pairReports || []} />
      </div>

      <div className="bg-base-200 rounded-lg">
        {pairReports && pairReports.length > 0 ? (
          <>
            {/* Заголовок таблицы */}
            <div className="flex items-center bg-base-300 px-4 py-2 font-medium text-sm border-b border-base-300">
              <div className="w-40 flex-shrink-0">ID</div>
              <div className="w-40 flex-shrink-0">Date</div>
              <div className="w-20 flex-shrink-0">Pairs</div>
              <div className="flex-1 min-w-0">Backtest</div>
              <div className="flex-shrink-0 ml-4 text-right">Actions</div>
            </div>

            {/* Виртуализированный список */}
            <div className="overflow-hidden">
              <List
                height={Math.min(600, pairReports.length * 80)} // Максимальная высота 600px или высота всех элементов
                width="100%" // Ширина списка
                itemCount={pairReports.length}
                itemSize={80} // Высота каждой строки
                itemData={{
                  items: pairReports,
                  updateReport,
                  deleteReport,
                  isUpdating,
                  isDeleting,
                  renderBacktestStats,
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
