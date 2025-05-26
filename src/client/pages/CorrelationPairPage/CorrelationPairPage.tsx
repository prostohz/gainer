import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TTimeframe, TCorrelation } from '../../../shared/types';
import { Candle } from '../../../server/models/Candle';
import { http } from '../../shared/http';
import { useQSState } from '../../shared/queryString';
import { AssetSelector } from '../../widgets/AssetSelector';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { CandleChart } from '../../widgets/CandleChart';
import { useAssets } from '../../entities/assets';
import { Metrics } from './Metrics';
import { MetricRolling } from './MetricRolling';
import { Calculator } from './Calculator';

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

export const CorrelationPairPage = () => {
  const { assetList, assetMap, isLoading: isAssetsLoading } = useAssets();
  const [timeframe, setTimeframe] = useState<TTimeframe>('1m');

  const [symbolA, setSymbolA] = useQSState<string | null>('tickerA', null);
  const [symbolB, setSymbolB] = useQSState<string | null>('tickerB', null);

  const { data: pairCorrelation = null, isLoading } = useQuery<TCorrelation>({
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

  const { data: assetAPrice = null } = useQuery<number>({
    queryKey: ['assetAPrice', symbolA],
    queryFn: () => http.get(`/api/asset/price?symbol=${symbolA}`).then((res) => res.data),
    enabled: Boolean(symbolA),
  });

  const { data: assetBPrice = null } = useQuery<number>({
    queryKey: ['assetBPrice', symbolB],
    queryFn: () => http.get(`/api/asset/price?symbol=${symbolB}`).then((res) => res.data),
    enabled: Boolean(symbolB),
  });

  const assetA = symbolA ? assetMap[symbolA] : null;
  const assetB = symbolB ? assetMap[symbolB] : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        {symbolA && symbolB ? (
          <span>
            Correlation Pair <span className="text-primary">{symbolA}</span> -{' '}
            <span className="text-primary">{symbolB}</span>
          </span>
        ) : (
          'Correlation Pair'
        )}
      </h1>

      <div className="flex flex-row gap-4">
        <div className="p-4 bg-base-200 rounded-lg">
          <div className="flex flex-row gap-4 flex-grow min-w-96">
            <AssetSelector
              isLoading={isAssetsLoading}
              assets={assetList}
              selectedAssetSymbol={symbolA}
              onAssetSelect={setSymbolA}
            />
            <AssetSelector
              isLoading={isAssetsLoading}
              assets={assetList}
              selectedAssetSymbol={symbolB}
              onAssetSelect={setSymbolB}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-grow">
          {pairCorrelation && (
            <>
              <div className="p-4 bg-base-200 rounded-lg">
                <h2 className="text-lg font-bold mb-2">Calculator</h2>
                <div className="min-h-[180px]">
                  {assetAPrice && assetBPrice && assetA && assetB && (
                    <Calculator
                      longLastPrice={Number(assetBPrice).toFixed(assetB.pricePrecision)}
                      shortLastPrice={Number(assetAPrice).toFixed(assetA.pricePrecision)}
                    />
                  )}
                </div>
              </div>
              <div className="p-4 bg-base-200 rounded-lg">
                <h2 className="text-lg font-bold">Metrics</h2>
                <Metrics
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
                    selectedTimeFrame={timeframe}
                    setSelectedTimeFrame={setTimeframe}
                  />
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
          )}

          {!pairCorrelation && !isLoading && (
            <div className="p-4 bg-base-200 rounded-lg">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-md text-neutral-content">No assets selected</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
