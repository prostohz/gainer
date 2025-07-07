import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { TMRReport } from '../../../shared/types';
import { dayjs } from '../../../shared/utils/daytime';
import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';
import { DateTimePicker } from '../../shared/ui/Calendar';
import { BacktestTrades } from '../../widgets/backtest/BacktestTrades';
import { Loader } from '../../shared/ui/Loader';
import { BacktestTradesByTimeHistogram } from '../../widgets/backtest/BacktestTradesByTimeHistogram';

export const MRReportBacktestPage = () => {
  const { id } = useParams();

  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);

  const {
    data: report,
    isLoading,
    refetch: refetchReport,
  } = useQuery<TMRReport>({
    queryKey: ['report', id],
    queryFn: () =>
      http.get(`/api/mrReport/${id}`).then((response) => ({
        ...response.data,
        date: Number(response.data.date),
      })),
  });

  useEffect(() => {
    if (report) {
      setStartDate(report.date);
      setEndDate(dayjs(report.date).add(1, 'hour').valueOf());
    }
  }, [report]);

  const {
    mutate: runBacktest,
    isPending: isBacktestRunning,
    error: backtestError,
  } = useMutation({
    mutationFn: () => {
      return http.post(`/api/mrReport/${id}/backtest`, {
        startTimestamp: startDate,
        endTimestamp: endDate,
      });
    },
    onSuccess: () => {
      refetchReport();
    },
  });

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    if (!report) {
      return <div className="text-center p-4">No report found</div>;
    }
    if (isBacktestRunning) {
      return <Loader />;
    }
    if (backtestError) {
      return (
        <div className="alert alert-error">Error running backtest: {backtestError.message}</div>
      );
    }

    const trades = report.backtestTrades || [];

    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-4">
          <BacktestTradesByTimeHistogram trades={trades} />
          <BacktestTrades trades={trades} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <Title value={`Mean Reversion Report Backtest (${id})`} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          <Link to="/mrReport" className="link link-hover link-primary">
            Mean Reversion Reports
          </Link>{' '}
          /{' '}
          <Link to={`/mrReport/${id}`} className="link link-hover link-primary">
            {report ? dayjs(report.date).format('DD.MM.YYYY HH:mm') : id}
          </Link>{' '}
          / Backtest
        </h1>

        <div className="flex justify-between gap-4">
          <div className="flex gap-2">
            <DateTimePicker
              value={startDate ? new Date(startDate) : null}
              maxDate={new Date()}
              onChange={(date) => {
                setStartDate((date as Date).getTime());
              }}
              placeholder="Start time"
              timeIntervals={15}
              disabled={isBacktestRunning}
            />

            <DateTimePicker
              value={endDate ? new Date(endDate) : null}
              minDate={startDate ? new Date(startDate) : undefined}
              maxDate={new Date()}
              onChange={(date) => {
                const selectedDate = date as Date;
                if (startDate && dayjs(selectedDate).isBefore(startDate)) {
                  setEndDate(startDate);
                } else {
                  setEndDate(selectedDate.getTime());
                }
              }}
              placeholder="End time"
              timeIntervals={15}
              disabled={isBacktestRunning}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => runBacktest()}
            disabled={isBacktestRunning}
          >
            {isBacktestRunning ? 'Running backtest...' : 'Run backtest'}
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};
