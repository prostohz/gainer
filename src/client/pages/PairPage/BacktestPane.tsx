import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import cn from 'classnames';

import { TTimeframe } from '../../../shared/types';
import { http } from '../../shared/utils/http';
import { useLSState } from '../../shared/utils/localStorage';
import { DateTimePicker } from '../../shared/ui/Calendar';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { useAssets } from '../../entities/assets';

type BacktestPaneProps = {
  symbolA: string | null;
  symbolB: string | null;
};

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
  openReason: string;
  closeReason: string;
};

type TBacktestResults = TBacktestTrade[];

const BacktestResults = ({ results }: { results: TBacktestResults }) => {
  const { assetMap } = useAssets();

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
        <h3 className="text-lg font-semibold mb-3">Backtest results</h3>

        <div className="grid grid-cols-8 gap-4 mb-4">
          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Total trades</div>
            <div className="stat-value text-lg">{totalTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Profitable</div>
            <div className="stat-value text-lg text-success">{profitableTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Unprofitable</div>
            <div className="stat-value text-lg text-success">{unprofitableTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Win rate</div>
            <div className="stat-value text-lg">{winRate.toFixed(1)}%</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Total profit</div>
            <div
              className={cn('stat-value text-lg', {
                'text-success': totalProfit >= 0,
                'text-error': totalProfit < 0,
              })}
            >
              {totalProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Average profit</div>
            <div
              className={cn('stat-value text-lg', {
                'text-success': avgProfit >= 0,
                'text-error': avgProfit < 0,
              })}
            >
              {avgProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Max profit</div>
            <div className="stat-value text-lg text-success">{maxProfit.toFixed(2)}%</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Max loss</div>
            <div className="stat-value text-lg text-error">{maxLoss.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {totalTrades > 0 && (
        <div className="bg-base-300 rounded-lg p-4">
          <h4 className="text-md font-semibold mb-3">Trade history</h4>
          <div className="overflow-x-auto max-h-96">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Open time</th>
                  <th>Close time</th>
                  <th>Duration</th>
                  <th>Direction</th>
                  <th>Price A (open/close)</th>
                  <th>Price B (open/close)</th>
                  <th>Profit %</th>
                  <th>Open reason</th>
                  <th>Close reason</th>
                </tr>
              </thead>
              <tbody>
                {results.map((trade, index) => {
                  const assetA = assetMap[trade.assetA.symbol];
                  const assetB = assetMap[trade.assetB.symbol];

                  const assetAPricePrecision = assetA.pricePrecision;
                  const assetBPricePrecision = assetB.pricePrecision;

                  return (
                    <tr
                      key={index}
                      className={cn({
                        'bg-success/10': trade.profitPercent >= 0,
                        'bg-error/10': trade.profitPercent < 0,
                      })}
                    >
                      <td className="text-xs">{dayjs(trade.openTime).format('DD.MM HH:mm:ss')}</td>
                      <td className="text-xs">{dayjs(trade.closeTime).format('DD.MM HH:mm:ss')}</td>
                      <td className="text-xs">
                        {dayjs(trade.closeTime).diff(dayjs(trade.openTime), 'minutes')}m
                      </td>
                      <td className="text-xs">
                        <span className="badge badge-sm badge-info">
                          {trade.direction === 'buy-sell' ? 'BUY/SELL' : 'SELL/BUY'}
                        </span>
                      </td>
                      <td className="text-xs">
                        {trade.openPriceA.toFixed(assetAPricePrecision)} /{' '}
                        {trade.closePriceA.toFixed(assetAPricePrecision)}
                      </td>
                      <td className="text-xs">
                        {trade.openPriceB.toFixed(assetBPricePrecision)} /{' '}
                        {trade.closePriceB.toFixed(assetBPricePrecision)}
                      </td>
                      <td
                        className={cn('text-xs font-semibold', {
                          'text-success': trade.profitPercent >= 0,
                          'text-error': trade.profitPercent < 0,
                        })}
                      >
                        {trade.profitPercent.toFixed(2)}%
                      </td>
                      <td className="text-xs">{trade.openReason}</td>
                      <td className="text-xs">{trade.closeReason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const BacktestPane = ({ symbolA, symbolB }: BacktestPaneProps) => {
  const [startDate, setStartDate] = useLSState<number>('backtestStartDate', Date.now());
  const [endDate, setEndDate] = useLSState<number>('backtestEndDate', startDate);
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
          startTimestamp: startDate,
          endTimestamp: endDate,
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
              value={new Date(startDate)}
              maxDate={new Date()}
              onChange={(date) => {
                setStartDate((date as Date).getTime());
                clearResults();
              }}
              placeholder="Start time"
              timeIntervals={15}
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
                clearResults();
              }}
              placeholder="End time"
              timeIntervals={15}
            />
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-primary w-48"
              disabled={!symbolA || !symbolB || !startDate || !endDate || isPending}
              onClick={() => runBacktest()}
            >
              {isPending ? 'Running...' : 'Run backtest'}
            </button>
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
