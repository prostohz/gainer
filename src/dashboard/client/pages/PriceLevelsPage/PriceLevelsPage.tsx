import { useEffect, useMemo, useState } from 'react';
import * as R from 'remeda';

import { Chart } from './Chart';
import { TPriceLevels } from '../../../server/api/priceLevels/types';
import { useAssets } from '../../entities/assets';
import { AssetSelector } from '../../widgets/AssetSelector';
import { PriceLevels } from './PriceLevels';

export const PriceLevelsPage = () => {
  const { assets } = useAssets();

  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>('BTCUSDT');
  const [assetData, setAssetData] = useState<TPriceLevels | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>('15m');
  const [minStrength, setMinStrength] = useState<number>(0);

  useEffect(() => {
    if (selectedAssetSymbol) return;
    if (!assets.length) return;

    setSelectedAssetSymbol(assets[0].symbol);
  }, [assets, selectedAssetSymbol]);

  useEffect(() => {
    if (!assets || !selectedAssetSymbol) {
      return;
    }

    fetch(`http://localhost:3001/api/priceLevels?symbol=${selectedAssetSymbol}`)
      .then((response) => response.json())
      .then((data) => setAssetData(data));
  }, [assets, selectedAssetSymbol]);

  const supportLevels = useMemo(() => {
    if (!assetData) return [];

    const minStr = minStrength || 0;

    return assetData.supportLevels.filter((item) => item.strength >= minStr);
  }, [assetData, minStrength]);

  const resistanceLevels = useMemo(() => {
    if (!assetData) return [];

    const minStr = minStrength || 0;

    return assetData.resistanceLevels.filter((item) => item.strength >= minStr);
  }, [assetData, minStrength]);

  const klines = useMemo(() => {
    if (!assetData) return [];

    return assetData.timeframeKlines[selectedTimeFrame as keyof typeof assetData.timeframeKlines];
  }, [assetData, selectedTimeFrame]);

  const supportLevelsOnChart = useMemo(() => {
    const minPrice = R.pipe(
      klines,
      R.map((kline) => parseFloat(kline.low)),
      R.firstBy([R.identity(), 'asc']),
    );
    const maxPrice = R.pipe(
      klines,
      R.map((kline) => parseFloat(kline.high)),
      R.firstBy([R.identity(), 'desc']),
    );

    if (!minPrice || !maxPrice) return [];

    return supportLevels.filter((item) => item.price >= minPrice && item.price <= maxPrice);
  }, [klines, supportLevels]);

  const resistanceLevelsOnChart = useMemo(() => {
    const minPrice = R.pipe(
      klines,
      R.map((kline) => parseFloat(kline.low)),
      R.firstBy([R.identity(), 'asc']),
    );
    const maxPrice = R.pipe(
      klines,
      R.map((kline) => parseFloat(kline.high)),
      R.firstBy([R.identity(), 'desc']),
    );

    if (!minPrice || !maxPrice) return [];

    return resistanceLevels.filter((item) => item.price >= minPrice && item.price <= maxPrice);
  }, [klines, resistanceLevels]);

  useEffect(() => {
    if (!assetData) return;

    const timeframes = Object.keys(assetData.timeframeKlines);

    if (!timeframes.includes(selectedTimeFrame)) {
      setSelectedTimeFrame(timeframes[0]);
    }
  }, [assetData, selectedTimeFrame]);

  const currentPrice = useMemo(() => {
    if (!assetData) return 0;

    const klines =
      assetData.timeframeKlines[selectedTimeFrame as keyof typeof assetData.timeframeKlines];
    const prices = klines.map((kline) => parseFloat(kline.close));

    return prices[prices.length - 1];
  }, [assetData, selectedTimeFrame]);

  const renderTimeFrameSelector = () => {
    const timeFrames = assetData ? R.keys(assetData.timeframeKlines) : [];

    return (
      <select
        className="select select-bordered select-sm w-full"
        value={selectedTimeFrame}
        onChange={(e) => setSelectedTimeFrame(e.target.value)}
      >
        {timeFrames.map((timeFrame) => (
          <option key={timeFrame} value={timeFrame}>
            {timeFrame}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">
          <span className="text-primary">{assetData?.asset.symbol}</span> Price Chart with Levels (
          {selectedTimeFrame})
        </h1>
        <div className="text-2xl font-bold">
          Current Price: <span className="text-primary">${currentPrice}</span>
        </div>
      </div>

      <div className="flex flex-row gap-6 flex-1">
        <div className="flex-grow overflow-auto min-h-[500px]">
          {assetData ? (
            <>
              <div className="mb-6">
                <Chart
                  klines={klines}
                  supportLevels={supportLevelsOnChart}
                  resistanceLevels={resistanceLevelsOnChart}
                  precision={assetData.precision}
                />
              </div>
              <PriceLevels assetData={assetData} />
            </>
          ) : (
            <div className="flex justify-center items-center h-[500px]">
              <div className="loading loading-ring loading-lg"></div>
            </div>
          )}
        </div>

        <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
          <div className="p-4 bg-base-200 rounded-lg">
            <div className="flex flex-col gap-6">
              <div>
                <label className="font-medium block mb-2" htmlFor="timeFrameSelector">
                  Timeframe:
                </label>
                {renderTimeFrameSelector()}
              </div>

              <div>
                <label className="font-medium block mb-2" htmlFor="minStrength">
                  Minimum strength:
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full"
                  min="0"
                  step="1"
                  value={minStrength}
                  onChange={(e) => setMinStrength(parseInt(e.target.value))}
                />
              </div>

              <div>
                <label className="font-medium block mb-2">Select Asset:</label>
                <div className="overflow-auto">
                  <AssetSelector
                    assets={assets}
                    selectedAssetSymbol={selectedAssetSymbol}
                    onAssetSelect={setSelectedAssetSymbol}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
