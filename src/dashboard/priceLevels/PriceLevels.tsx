import { useEffect, useMemo, useState } from 'react';
import * as R from 'remeda';

import data from '../../preview/priceLevels/data.json';
import { getColorForStrength } from './colors';
import { PriceLevelsChart } from './PriceLevelsChart';

const PriceLevels = () => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>('15m');
  const [minStrength, setMinStrength] = useState<number>(0);

  const supportLevels = useMemo(() => {
    const minStr = minStrength || 0;

    return data.supportLevels.filter((item) => item.strength >= minStr);
  }, [minStrength]);

  const resistanceLevels = useMemo(() => {
    const minStr = minStrength || 0;

    return data.resistanceLevels.filter((item) => item.strength >= minStr);
  }, [minStrength]);

  const klines = useMemo(() => {
    return data.timeframeKlines[selectedTimeFrame as keyof typeof data.timeframeKlines];
  }, [selectedTimeFrame]);

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
    const timeframes = Object.keys(data.timeframeKlines);

    if (!timeframes.includes(selectedTimeFrame)) {
      setSelectedTimeFrame(timeframes[0]);
    }
  }, []);

  const currentPrice = useMemo(() => {
    const klines = data.timeframeKlines[selectedTimeFrame as keyof typeof data.timeframeKlines];
    const prices = klines.map((kline) => parseFloat(kline.close));

    return prices[prices.length - 1];
  }, [selectedTimeFrame]);

  const renderSupportLevelsList = () => {
    const { precision } = data;

    return (
      <div className="space-y-4">
        {R.sortBy(data.supportLevels, [R.prop('price'), 'desc']).map((level, index) => (
          <div
            className={`flex items-center space-x-2 p-3 rounded bg-base-300`}
            key={`support-${index}`}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{
                backgroundColor: getColorForStrength(level.strength),
              }}
            ></div>
            <div className="text-sm">
              {level.price.toFixed(precision)} (Strength: {level.strength})
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResistanceLevelsList = () => {
    const { precision } = data;

    return (
      <div className="space-y-4">
        {R.sortBy(data.resistanceLevels, [R.prop('price'), 'asc']).map((level, index) => (
          <div
            className={`flex items-center space-x-2 p-3 rounded bg-base-300`}
            key={`resistance-${index}`}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{
                backgroundColor: getColorForStrength(level.strength),
              }}
            ></div>
            <div className="text-sm">
              {level.price.toFixed(precision)} (Strength: {level.strength})
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTimeFrameSelector = () => {
    const timeFrames = R.keys(data.timeframeKlines);

    return (
      <select
        className="select select-bordered select-sm"
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
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">
          <span className="text-primary">{data.asset.symbol}</span> Price Chart with Levels (
          {selectedTimeFrame})
        </h1>
        <div className="text-2xl font-bold">
          Current Price: <span className="text-primary">${currentPrice}</span>
        </div>
      </div>

      <div className="flex flex-row gap-6">
        <div className="flex-grow">
          <div className="mb-6">
            <PriceLevelsChart
              klines={klines}
              supportLevels={supportLevelsOnChart}
              resistanceLevels={resistanceLevelsOnChart}
              precision={data.precision}
            />
          </div>

          <div className="flex bg-base-200 rounded-lg mb-6">
            <div className="p-4 flex-1">
              <h3 className="text-lg font-semibold mb-4">Support Levels</h3>
              {renderSupportLevelsList()}
            </div>

            <div className="p-4 flex-1">
              <h3 className="text-lg font-semibold mb-4">Resistance Levels</h3>
              {renderResistanceLevelsList()}
            </div>
          </div>
        </div>

        <div className="w-80 flex-shrink-0">
          <div className="p-4 bg-base-200 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">Filters</h3>
            <div className="flex flex-col gap-4">
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
                  className="input input-bordered input-sm"
                  min="0"
                  step="1"
                  value={minStrength}
                  onChange={(e) => setMinStrength(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceLevels;
