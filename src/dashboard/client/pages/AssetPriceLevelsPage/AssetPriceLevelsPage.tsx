import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as R from 'remeda';

import http from '../../shared/http';
import { Chart } from '../../widgets/Chart';
import { TPriceLevels } from '../../../server/services/assetService/types';
import { TTimeframe, TKline } from '../../../../trading/types';
import { useAssets } from '../../entities/assets';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { AssetSelector } from '../../widgets/AssetSelector';
import { PriceLevels } from './PriceLevels';

export const AssetPriceLevelsPage = () => {
  const { assetList, assetMap } = useAssets();

  const [assetSymbol, setAssetSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<TTimeframe>('15m');
  const [minStrength, setMinStrength] = useState<number>(0);

  useEffect(() => {
    if (assetSymbol) return;
    if (!assetList.length) return;

    setAssetSymbol(assetList[0].symbol);
  }, [assetList, assetSymbol]);

  const { data: assetKlines = null } = useQuery<TKline[]>({
    queryKey: ['assetKlines', assetSymbol, timeframe],
    queryFn: () =>
      http
        .get(`/api/asset/klines?symbol=${assetSymbol}&timeframe=${timeframe}`)
        .then((res) => res.data),
  });

  const { data: assetPriceLevels = null } = useQuery<TPriceLevels>({
    queryKey: ['priceLevels', assetSymbol],
    queryFn: () => http.get(`/api/priceLevels?symbol=${assetSymbol}`).then((res) => res.data),
  });

  const asset = useMemo(() => {
    if (!assetMap) return null;

    return assetMap[assetSymbol];
  }, [assetMap, assetSymbol]);

  const supportLevels = useMemo(() => {
    if (!assetPriceLevels) return [];

    const minStr = minStrength || 0;

    return assetPriceLevels.supportLevels.filter((item) => item.strength >= minStr);
  }, [assetPriceLevels, minStrength]);

  const resistanceLevels = useMemo(() => {
    if (!assetPriceLevels) return [];

    const minStr = minStrength || 0;

    return assetPriceLevels.resistanceLevels.filter((item) => item.strength >= minStr);
  }, [assetPriceLevels, minStrength]);

  const supportLevelsOnChart = useMemo(() => {
    if (!assetKlines) return [];

    const minPrice = R.pipe(
      assetKlines,
      R.map((kline) => parseFloat(kline.low)),
      R.firstBy([R.identity(), 'asc']),
    );
    const maxPrice = R.pipe(
      assetKlines,
      R.map((kline) => parseFloat(kline.high)),
      R.firstBy([R.identity(), 'desc']),
    );

    if (!minPrice || !maxPrice) return [];

    return supportLevels.filter((item) => item.price >= minPrice && item.price <= maxPrice);
  }, [assetKlines, supportLevels]);

  const resistanceLevelsOnChart = useMemo(() => {
    if (!assetKlines) return [];

    const minPrice = R.pipe(
      assetKlines,
      R.map((kline) => parseFloat(kline.low)),
      R.firstBy([R.identity(), 'asc']),
    );
    const maxPrice = R.pipe(
      assetKlines,
      R.map((kline) => parseFloat(kline.high)),
      R.firstBy([R.identity(), 'desc']),
    );

    if (!minPrice || !maxPrice) return [];

    return resistanceLevels.filter((item) => item.price >= minPrice && item.price <= maxPrice);
  }, [assetKlines, resistanceLevels]);

  const currentPrice = useMemo(() => {
    if (!assetKlines) return 0;

    const klines = assetKlines;
    const prices = klines.map((kline) => parseFloat(kline.close));

    return prices[prices.length - 1];
  }, [assetKlines]);

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">
          <span className="text-primary">{asset?.symbol}</span> Price Chart with Levels ({timeframe}
          )
        </h1>
        <div className="text-2xl font-bold">
          Current Price: <span className="text-primary">${currentPrice}</span>
        </div>
      </div>

      <div className="flex flex-row gap-6 flex-1">
        <div className="flex-grow overflow-auto min-h-[500px]">
          {assetKlines && assetPriceLevels && asset ? (
            <>
              <div className="h-[500px] mb-6">
                <Chart
                  klines={assetKlines}
                  supportLevels={supportLevelsOnChart}
                  resistanceLevels={resistanceLevelsOnChart}
                  precision={asset.precision}
                />
              </div>
              <PriceLevels asset={asset} priceLevels={assetPriceLevels} />
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
                <TimeframeSelector
                  selectedTimeFrame={timeframe}
                  setSelectedTimeFrame={setTimeframe}
                />
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
                    assets={assetList}
                    selectedAssetSymbol={assetSymbol}
                    onAssetSelect={setAssetSymbol}
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
