import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { TCompleteTrade } from '../../../server/trading/strategies/MeanReversionStrategy/backtest';
import { TPairReportEntry } from '../../../shared/types';
import { dayjs } from '../../../shared/utils/daytime';
import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';
import { DateTimePicker } from '../../shared/ui/Calendar';
import { BacktestResults } from '../../widgets/BacktestResults';
import { Loader } from '../../shared/ui/Loader';
import { TradeDistributionCharts } from './TradeDistributionCharts';

export const PairReportBacktestPage = () => {
  const { id } = useParams();

  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);

  const { data: report, isLoading } = useQuery<{
    id: string;
    date: number;
    data: TPairReportEntry[];
  }>({
    queryKey: ['report', id],
    queryFn: () => http.get(`/api/pairReport/${id}`).then((response) => response.data),
  });

  useEffect(() => {
    if (report) {
      setStartDate(report.date);
      setEndDate(dayjs(report.date).add(1, 'hour').valueOf());
    }
  }, [report]);

  const { data: backtest, refetch: refetchBacktest } = useQuery<TCompleteTrade[]>({
    queryKey: ['backtest', id],
    queryFn: () => http.get(`/api/pairReport/${id}/backtest`).then((response) => response.data),
  });

  const {
    mutate: runBacktest,
    isPending: isBacktestRunning,
    error: backtestError,
  } = useMutation({
    mutationFn: () => {
      return http.post(`/api/pairReport/${id}/backtest`, {
        startTimestamp: startDate,
        endTimestamp: endDate,
      });
    },
    onSuccess: () => {
      refetchBacktest();
    },
  });

  const renderBacktest = () => {
    if (isBacktestRunning) {
      return <Loader />;
    }

    if (backtestError) {
      return (
        <div className="alert alert-error">Error running backtest: {backtestError.message}</div>
      );
    }

    if (!backtest) {
      return <div className="text-center p-4">No backtest found</div>;
    }

    return (
      <div className="space-y-4">
        <TradeDistributionCharts trades={backtest} />
        <div className="bg-base-200 rounded-lg p-4">
          <BacktestResults results={backtest} />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    if (!report) {
      return <div className="text-center p-4">No report found</div>;
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between">
          <div className="flex gap-4">
            <DateTimePicker
              value={new Date(startDate)}
              maxDate={new Date()}
              onChange={(date) => {
                setStartDate((date as Date).getTime());
              }}
              placeholder="Start time"
              timeIntervals={15}
              disabled={isBacktestRunning}
            />

            <DateTimePicker
              value={new Date(endDate)}
              minDate={new Date(startDate)}
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
            className="btn btn-primary"
            onClick={() => runBacktest()}
            disabled={isBacktestRunning}
          >
            {isBacktestRunning ? 'Running backtest...' : 'Run backtest'}
          </button>
        </div>

        {renderBacktest()}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <Title value={`Pair Report Backtest (${id})`} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Pair Report Backtest</h1>
        {report && (
          <div className="text-md text-info font-semibold">
            Report: {dayjs(report.date).format('DD.MM.YYYY HH:mm')}
          </div>
        )}
      </div>

      {renderContent()}
    </div>
  );
};
