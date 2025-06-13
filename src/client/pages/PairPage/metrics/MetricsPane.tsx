import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TCorrelation, TTimeframe } from '../../../../shared/types';
import { Candle } from '../../../../server/models/Candle';
import { http } from '../../../shared/utils/http';
import { TimeframeSelector } from '../../../widgets/TimeframeSelector';
import { MetricsStats } from './MetricsStats';
import { MetricRolling } from './MetricRolling';
import { useAssets } from '../../../entities/assets';
import { CandleChart } from '../../../widgets/CandleChart';

const rollingCorrelationColors = {
  '-0.9': '#22c55e', // зеленый
  '-0.8': '#eab308', // желтый
  '0.8': '#eab308', // желтый
  '0.9': '#22c55e', // зеленый
};

const rollingZScoreColors = {
  '-3': '#22c55e', // зеленый
  '-2': '#eab308', // желтый
  '2': '#eab308', // желтый
  '3': '#22c55e', // зеленый
};

type TProps = {
  symbolA: string | null;
  symbolB: string | null;
  timeframe: TTimeframe;
};

export const MetricsPane = ({ symbolA, symbolB, timeframe }: TProps) => {
  const { assetMap } = useAssets();

  const [selectedTimeframe, setSelectedTimeframe] = useState<TTimeframe>(timeframe);

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
    queryKey: ['assetA', symbolA, selectedTimeframe],
    queryFn: () =>
      http
        .get(`/api/asset/candles?symbol=${symbolA}&timeframe=${selectedTimeframe}`)
        .then((res) => res.data),
    enabled: Boolean(symbolA) && Boolean(selectedTimeframe),
  });

  const { data: assetBCandles = null } = useQuery<Candle[]>({
    queryKey: ['assetB', symbolB, selectedTimeframe],
    queryFn: () =>
      http
        .get(`/api/asset/candles?symbol=${symbolB}&timeframe=${selectedTimeframe}`)
        .then((res) => res.data),
    enabled: Boolean(symbolB) && Boolean(selectedTimeframe),
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
          <TimeframeSelector
            selectedTimeFrame={selectedTimeframe}
            setSelectedTimeFrame={setSelectedTimeframe}
          />
        </div>
      </div>
      <div className="p-4 bg-base-200 rounded-lg flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-lg font-bold">Rolling Correlation by Prices</h2>
          <MetricRolling
            data={pairCorrelation.rollingCorrelationByPrices[selectedTimeframe]}
            colors={rollingCorrelationColors}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-lg font-bold">Rolling Correlation by Returns</h2>
          <MetricRolling
            data={pairCorrelation.rollingCorrelationByReturns[selectedTimeframe]}
            colors={rollingCorrelationColors}
          />
        </div>
      </div>
      <div className="p-4 flex gap-4 bg-base-200 rounded-lg">
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-lg font-bold">Rolling Z-Score by Prices</h2>
          <MetricRolling
            data={pairCorrelation.rollingZScoreByPrices[selectedTimeframe]}
            colors={rollingZScoreColors}
          />
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-lg font-bold">Rolling Z-Score by Returns</h2>
          <MetricRolling
            data={pairCorrelation.rollingZScoreByReturns[selectedTimeframe]}
            colors={rollingZScoreColors}
          />
        </div>
      </div>
      {assetA && assetB && assetACandles && assetBCandles && (
        <div className="flex gap-2 p-4 bg-base-200 rounded-lg">
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-lg font-bold">{assetA.symbol}</h2>
            <div className="h-96 w-full">
              <CandleChart candles={assetACandles} precision={assetA.pricePrecision} />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-lg font-bold">{assetB.symbol}</h2>
            <div className="h-96 w-full">
              <CandleChart candles={assetBCandles} precision={assetB.pricePrecision} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
