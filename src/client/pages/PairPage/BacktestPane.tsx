import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { TTimeframe } from '../../../shared/types';
import { DateTimePicker } from '../../shared/ui/Calendar';
import { http } from '../../shared/http';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';

type BacktestPaneProps = {
  symbolA: string | null;
  symbolB: string | null;
};

// Типы для результатов бэктеста
type TPositionDirection = 'buy-sell' | 'sell-buy';

type TBacktestTrade = {
  direction: TPositionDirection;
  assetA: {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
  };
  assetB: {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
  };
  openPriceA: number;
  closePriceA: number;
  openPriceB: number;
  closePriceB: number;
  openTime: number;
  closeTime: number;
  profitPercent: number;
  reason: string;
};

type TBacktestResults = TBacktestTrade[];

const BacktestResults = ({ results }: { results: TBacktestResults }) => {
  const totalTrades = results.length;
  const profitableTrades = results.filter((trade) => trade.profitPercent > 0).length;
  const unprofitableTrades = totalTrades - profitableTrades;
  const totalProfit = results.reduce((sum, trade) => sum + trade.profitPercent, 0);
  const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

  const maxProfit = Math.max(...results.map((trade) => trade.profitPercent), 0);
  const maxLoss = Math.min(...results.map((trade) => trade.profitPercent), 0);

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-base-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Результаты бэктеста</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Всего сделок</div>
            <div className="stat-value text-lg">{totalTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Прибыльных</div>
            <div className="stat-value text-lg text-success">{profitableTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Убыточных</div>
            <div className="stat-value text-lg text-success">{unprofitableTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Винрейт</div>
            <div className="stat-value text-lg">{winRate.toFixed(1)}%</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Общая прибыль</div>
            <div
              className={`stat-value text-lg ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}
            >
              {totalProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Средняя прибыль</div>
            <div className={`stat-value text-lg ${avgProfit >= 0 ? 'text-success' : 'text-error'}`}>
              {avgProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Макс. прибыль</div>
            <div className="stat-value text-lg text-success">{maxProfit.toFixed(2)}%</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Макс. убыток</div>
            <div className="stat-value text-lg text-error">{maxLoss.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {totalTrades > 0 && (
        <div className="bg-base-300 rounded-lg p-4">
          <h4 className="text-md font-semibold mb-3">История сделок</h4>
          <div className="overflow-x-auto max-h-96">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Время открытия</th>
                  <th>Время закрытия</th>
                  <th>Направление</th>
                  <th>Цена A (откр/закр)</th>
                  <th>Цена B (откр/закр)</th>
                  <th>Прибыль %</th>
                  <th>Причина</th>
                </tr>
              </thead>
              <tbody>
                {results.map((trade, index) => (
                  <tr
                    key={index}
                    className={trade.profitPercent >= 0 ? 'bg-success/10' : 'bg-error/10'}
                  >
                    <td className="text-xs">{dayjs(trade.openTime).format('DD.MM HH:mm:ss')}</td>
                    <td className="text-xs">{dayjs(trade.closeTime).format('DD.MM HH:mm:ss')}</td>
                    <td className="text-xs">
                      <span className="badge badge-sm badge-info">
                        {trade.direction === 'buy-sell' ? 'BUY/SELL' : 'SELL/BUY'}
                      </span>
                    </td>
                    <td className="text-xs">
                      {trade.openPriceA.toFixed(6)} / {trade.closePriceA.toFixed(6)}
                    </td>
                    <td className="text-xs">
                      {trade.openPriceB.toFixed(6)} / {trade.closePriceB.toFixed(6)}
                    </td>
                    <td
                      className={`text-xs font-semibold ${
                        trade.profitPercent >= 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      {trade.profitPercent.toFixed(2)}%
                    </td>
                    <td className="text-xs">{trade.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const BacktestPane = ({ symbolA, symbolB }: BacktestPaneProps) => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(startDate);
  const [timeframe, setTimeframe] = useState<TTimeframe>('1m');
  const [backtestResults, setBacktestResults] = useState<TBacktestResults | null>(null);

  const {
    mutate: runBacktest,
    isPending,
    error,
  } = useMutation({
    mutationFn: () =>
      http.post('/api/backtest', null, {
        params: {
          symbolA: symbolA,
          symbolB: symbolB,
          timeframe: timeframe,
          startTimestamp: startDate?.getTime(),
          endTimestamp: endDate?.getTime(),
        },
      }),
    onSuccess: (response) => {
      setBacktestResults(response.data);
    },
    onError: (error) => {
      console.error('Ошибка при выполнении бэктеста:', error);
      setBacktestResults(null);
    },
  });

  const clearResults = () => {
    setBacktestResults(null);
  };

  useEffect(() => {
    clearResults();
  }, [symbolA, symbolB]);

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <div className="space-y-4">
        <div className="flex items-top gap-4">
          <div className="flex-1">
            <TimeframeSelector
              selectedTimeFrame={timeframe}
              setSelectedTimeFrame={(newTimeframe) => {
                setTimeframe(newTimeframe);
                clearResults();
              }}
            />
          </div>

          <div className="flex gap-2">
            <DateTimePicker
              value={startDate}
              maxDate={new Date()}
              onChange={(date) => {
                setStartDate(date as Date);
                clearResults();
              }}
              placeholder="Start time"
              timeIntervals={15}
            />

            <DateTimePicker
              value={endDate}
              minDate={startDate ?? undefined}
              maxDate={new Date()}
              onChange={(date) => {
                const selectedDate = date as Date;
                if (startDate && dayjs(selectedDate).isBefore(startDate)) {
                  setEndDate(startDate);
                } else {
                  setEndDate(selectedDate);
                }
                clearResults();
              }}
              placeholder="End time"
              timeIntervals={15}
            />
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              disabled={!symbolA || !symbolB || !startDate || !endDate || isPending}
              onClick={() => runBacktest()}
            >
              {isPending ? 'Running...' : 'Run backtest'}
            </button>

            {backtestResults && (
              <button className="btn btn-outline" onClick={clearResults} disabled={isPending}>
                Clear results
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>Ошибка при выполнении бэктеста: {error.message}</span>
          </div>
        )}

        {backtestResults && <BacktestResults results={backtestResults} />}
      </div>
    </div>
  );
};
