import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TCorrelation, TTimeframe } from '../../../shared/types';
import { Candle } from '../../../server/models/Candle';
import { http } from '../../shared/http';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { MetricsStats } from './MetricsStats';
import { MetricRolling } from './MetricRolling';
import { useAssets } from '../../entities/assets';
import { CandleChart } from '../../widgets/CandleChart';

const rollingCorrelationColors = {
  '-0.9': '#84cc16', // лаймовый
  '-0.8': '#eab308', // желтый
  '0': '#ef4444', // красный
  '0.8': '#eab308', // желтый
  '0.9': '#84cc16', // лаймовый
};

const rollingZScoreColors = {
  '-4': '#22c55e', // зеленый
  '-3': '#84cc16', // лаймовый
  '-2': '#eab308', // желтый
  '-1': '#ef4444', // красный
  '0': '#ef4444', // красный
  '1': '#ef4444', // красный
  '2': '#eab308', // желтый
  '3': '#84cc16', // лаймовый
  '4': '#22c55e', // зеленый
};

type TProps = {
  symbolA: string | null;
  symbolB: string | null;
};

export const MetricsPane = ({ symbolA, symbolB }: TProps) => {
  const { assetMap } = useAssets();

  const [timeframe, setTimeframe] = useState<TTimeframe>('1m');

  const { data: pairCorrelation = null, isLoading: isPairCorrelationLoading } =
    useQuery<TCorrelation>({
      queryKey: ['pairCorrelation', symbolA, symbolB],
      queryFn: () =>
        http
          .get(`/api/correlation/pair?symbolA=${symbolA}&symbolB=${symbolB}`)
          .then((res) => res.data),
      enabled: Boolean(symbolA) && Boolean(symbolB),
    });

  const { data: assetACandles = null } = useQuery<Candle[]>({
    queryKey: ['assetA', symbolA, timeframe],
    queryFn: () =>
      http
        .get(`/api/asset/candles?symbol=${symbolA}&timeframe=${timeframe}`)
        .then((res) => res.data),
    enabled: Boolean(symbolA) && Boolean(timeframe),
  });

  const { data: assetBCandles = null } = useQuery<Candle[]>({
    queryKey: ['assetB', symbolB, timeframe],
    queryFn: () =>
      http
        .get(`/api/asset/candles?symbol=${symbolB}&timeframe=${timeframe}`)
        .then((res) => res.data),
    enabled: Boolean(symbolB) && Boolean(timeframe),
  });

  const assetA = symbolA ? assetMap[symbolA] : null;
  const assetB = symbolB ? assetMap[symbolB] : null;

  if (isPairCorrelationLoading) {
    return <div>Loading...</div>;
  }

  if (!pairCorrelation) {
    return (
      <div className="p-4 bg-base-200 rounded-lg">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-md text-neutral-content">No assets selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 bg-base-200 rounded-lg">
        <h2 className="text-lg font-bold">Metrics</h2>
        <MetricsStats
          correlationByPrices={pairCorrelation.correlationByPrices}
          correlationByReturns={pairCorrelation.correlationByReturns}
          zScoreByPrices={pairCorrelation.zScoreByPrices}
          zScoreByReturns={pairCorrelation.zScoreByReturns}
          cointegration={pairCorrelation.cointegration}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="timeframe">Timeframe</label>
        <div className="w-32">
          <TimeframeSelector selectedTimeFrame={timeframe} setSelectedTimeFrame={setTimeframe} />
        </div>
      </div>
      <div className="p-4 bg-base-200 rounded-lg flex flex-row gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-lg font-bold mb-2">Rolling Correlation by Prices</h2>
          <MetricRolling
            data={pairCorrelation.rollingCorrelationByPrices[timeframe]}
            colors={rollingCorrelationColors}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-lg font-bold mb-2">Rolling Correlation by Returns</h2>
          <MetricRolling
            data={pairCorrelation.rollingCorrelationByReturns[timeframe]}
            colors={rollingCorrelationColors}
          />
        </div>
      </div>
      <div className="p-4 bg-base-200 rounded-lg flex flex-row gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-lg font-bold mb-2">Rolling Z-Score by Prices</h2>
          <MetricRolling
            data={pairCorrelation.rollingZScoreByPrices[timeframe]}
            colors={rollingZScoreColors}
          />
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-lg font-bold mb-2">Rolling Z-Score by Returns</h2>
          <MetricRolling
            data={pairCorrelation.rollingZScoreByReturns[timeframe]}
            colors={rollingZScoreColors}
          />
        </div>
      </div>
      <div className="p-4 bg-base-200 rounded-lg">
        {assetA && assetB && assetACandles && assetBCandles && (
          <div className="flex gap-2">
            <div className="flex-grow h-96 w-full">
              <div className="font-semibold">{assetA.symbol}</div>
              <CandleChart candles={assetACandles} precision={assetA.pricePrecision} />
            </div>
            <div className="flex-grow h-96 w-full">
              <div className="font-semibold">{assetB.symbol}</div>
              <CandleChart candles={assetBCandles} precision={assetB.pricePrecision} />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
