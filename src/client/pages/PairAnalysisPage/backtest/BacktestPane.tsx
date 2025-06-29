import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { TTimeframe } from '../../../../shared/types';
import { TCompleteTrade } from '../../../../server/trading/strategies/MRStrategy/backtest';
import { dayjs } from '../../../../shared/utils/daytime';
import { Candle } from '../../../../server/models/Candle';
import { http } from '../../../shared/utils/http';
import { useLSState } from '../../../shared/utils/localStorage';
import { DateTimePicker } from '../../../shared/ui/Calendar';
import { TimeframeSelector } from '../../../widgets/TimeframeSelector';
import { SyncedTradeChart, SyncedChartsContainer } from '../../../widgets/SyncedTradeCharts';
import { BacktestTrades } from '../../../widgets/BacktestTrades';
import { useAssets } from '../../../entities/assets';

type BacktestPaneProps = {
  symbolA: string | null;
  symbolB: string | null;
};

export const BacktestPane = ({ symbolA, symbolB }: BacktestPaneProps) => {
  const [startDate, setStartDate] = useLSState<number>('backtestStartDate', Date.now());
  const [endDate, setEndDate] = useLSState<number>('backtestEndDate', startDate);
  const [timeframe, setTimeframe] = useState<TTimeframe>('1m');
  const [backtestResults, setBacktestResults] = useState<TCompleteTrade[] | null>(null);

  const { assetMap } = useAssets();

  const assetA = symbolA ? assetMap[symbolA] : null;
  const assetB = symbolB ? assetMap[symbolB] : null;

  const {
    data: assetACandles = [],
    isLoading: isLoadingAssetACandles,
    refetch: refetchAssetACandles,
  } = useQuery<Candle[]>({
    queryKey: ['assetCandles', symbolA, startDate, endDate, timeframe],

    queryFn: () => {
      const urlParams = new URLSearchParams();
      urlParams.set('symbol', symbolA!);
      urlParams.set('timeframe', timeframe);
      urlParams.set('startTimestamp', startDate.toString());
      urlParams.set('endTimestamp', endDate.toString());
      urlParams.set('limit', String(1000));

      return http.get(`/api/asset/candles?${urlParams.toString()}`).then((res) => res.data);
    },
    enabled: !!symbolA,
  });

  const {
    data: assetBCandles = [],
    isLoading: isLoadingAssetBCandles,
    refetch: refetchAssetBCandles,
  } = useQuery<Candle[]>({
    queryKey: ['assetCandles', symbolB, startDate, endDate, timeframe],

    queryFn: () => {
      const urlParams = new URLSearchParams();
      urlParams.set('symbol', symbolB!);
      urlParams.set('timeframe', timeframe);
      urlParams.set('startTimestamp', startDate.toString());
      urlParams.set('endTimestamp', endDate.toString());
      urlParams.set('limit', String(1000));

      return http.get(`/api/asset/candles?${urlParams.toString()}`).then((res) => res.data);
    },
    enabled: !!symbolB,
  });

  const {
    mutate: runBacktest,
    isPending: isBacktestRunning,
    error: backtestError,
  } = useMutation({
    mutationFn: () => {
      if (!assetA || !assetB) {
        throw new Error('Asset A or B is not found');
      }

      return http.post('/api/backtest', {
        pairs: [
          {
            assetA: {
              baseAsset: assetA.baseAsset,
              quoteAsset: assetA.quoteAsset,
            },
            assetB: {
              baseAsset: assetB.baseAsset,
              quoteAsset: assetB.quoteAsset,
            },
          },
        ],
        startTimestamp: startDate,
        endTimestamp: endDate,
      });
    },
    onSuccess: (response) => {
      setBacktestResults(response.data);
      refetchAssetACandles();
      refetchAssetBCandles();
    },
  });

  useEffect(() => {
    setBacktestResults(null);
  }, [symbolA, symbolB]);

  return (
    <div className="flex flex-col gap-4 bg-base-200 rounded-lg p-4 w-full min-w-0">
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

        <div className="flex gap-2">
          <button
            className="btn btn-primary w-48"
            onClick={() => runBacktest()}
            disabled={!symbolA || !symbolB || !startDate || !endDate || isBacktestRunning}
          >
            {isBacktestRunning ? 'Running...' : 'Run backtest'}
          </button>
        </div>
      </div>

      {backtestError && (
        <div className="alert alert-error">
          <span>Error during backtest: {backtestError.message}</span>
        </div>
      )}

      {backtestResults && (
        <div>
          <div className="mb-4 w-full min-w-0">
            <BacktestTrades results={backtestResults} />
          </div>

          <div className="flex justify-end mb-4">
            <div className="w-32">
              <TimeframeSelector
                selectedTimeFrame={timeframe}
                setSelectedTimeFrame={(newTimeframe) => {
                  setTimeframe(newTimeframe);
                }}
                disabled={isBacktestRunning}
              />
            </div>
          </div>

          <div className="bg-base-300 rounded-lg p-4 max-w-full">
            <SyncedChartsContainer>
              <div className="flex gap-4">
                {assetA && assetACandles.length > 0 && (
                  <div className="h-96 w-1/2">
                    <SyncedTradeChart
                      candles={assetACandles}
                      trades={backtestResults}
                      precision={assetA.pricePrecision}
                      symbol={assetA.symbol}
                      title={`A: ${assetA.symbol}`}
                    />
                  </div>
                )}

                {assetB && assetBCandles.length > 0 && (
                  <div className="h-96 w-1/2">
                    <SyncedTradeChart
                      candles={assetBCandles}
                      trades={backtestResults}
                      precision={assetB.pricePrecision}
                      symbol={assetB.symbol}
                      title={`B: ${assetB.symbol}`}
                    />
                  </div>
                )}
              </div>
            </SyncedChartsContainer>

            {(isLoadingAssetACandles || isLoadingAssetBCandles) && (
              <div className="h-96 flex items-center justify-center bg-base-100 rounded-lg">
                <span className="text-base-content/60">Loading chart data...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
