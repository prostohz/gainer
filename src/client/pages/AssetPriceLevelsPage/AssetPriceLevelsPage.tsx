import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as R from 'remeda';

import { TTimeframe, TPriceLevels } from '../../../shared/types';
import { Candle } from '../../../server/models/Candle';
import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';
import { Loader } from '../../shared/ui/Loader';
import { CandleChart } from '../../widgets/CandleChart';
import { TimeframeSelector } from '../../widgets/TimeframeSelector';
import { AssetSelector } from '../../widgets/AssetSelector';
import { useAssets } from '../../entities/assets';
import { PriceLevels } from './PriceLevels';

export const AssetPriceLevelsPage = () => {
  const { assetList, assetMap, isLoading: isAssetsLoading } = useAssets();

  const [assetSymbol, setAssetSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<TTimeframe>('15m');
  const [minStrength, setMinStrength] = useState<number>(0);

  useEffect(() => {
    if (assetSymbol) return;
    if (!assetList.length) return;

    setAssetSymbol(assetList[0].symbol);
  }, [assetList, assetSymbol]);

  const { data: assetCandles = null } = useQuery<Candle[]>({
    queryKey: ['assetCandles', assetSymbol, timeframe],
    queryFn: () =>
      http
        .get(`/api/asset/candles?symbol=${assetSymbol}&timeframe=${timeframe}`)
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
    if (!assetCandles) return [];

    const minPrice = R.pipe(
      assetCandles,
      R.map((candle) => Number(candle.low)),
      R.firstBy([R.identity(), 'asc']),
    );
    const maxPrice = R.pipe(
      assetCandles,
      R.map((candle) => Number(candle.high)),
      R.firstBy([R.identity(), 'desc']),
    );

    if (!minPrice || !maxPrice) return [];

    return supportLevels.filter((item) => item.price >= minPrice && item.price <= maxPrice);
  }, [assetCandles, supportLevels]);

  const resistanceLevelsOnChart = useMemo(() => {
    if (!assetCandles) return [];

    const minPrice = R.pipe(
      assetCandles,
      R.map((candle) => Number(candle.low)),
      R.firstBy([R.identity(), 'asc']),
    );
    const maxPrice = R.pipe(
      assetCandles,
      R.map((candle) => Number(candle.high)),
      R.firstBy([R.identity(), 'desc']),
    );

    if (!minPrice || !maxPrice) return [];

    return resistanceLevels.filter((item) => item.price >= minPrice && item.price <= maxPrice);
  }, [assetCandles, resistanceLevels]);

  const currentPrice = useMemo(() => {
    if (!asset || !assetCandles) return 0;

    const candles = assetCandles;
    const prices = candles.map((candle) => candle.close);

    return Number(prices[prices.length - 1]).toFixed(asset.pricePrecision);
  }, [assetCandles]);

  return (
    <div className="flex-1 flex flex-col">
      <Title value={`${asset?.symbol} Price Chart with Levels (${timeframe})`} />

      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">
          <span className="text-primary">{asset?.symbol}</span> Price Chart with Levels ({timeframe}
          )
        </h1>
        <div className="text-2xl font-bold">
          Current Price: <span className="text-primary">${currentPrice}</span>
        </div>
      </div>

      <div className="flex gap-4 flex-1">
        <div className="flex-grow overflow-auto">
          {assetCandles && assetPriceLevels && asset ? (
            <>
              <div className="h-[500px] mb-6">
                <CandleChart
                  candles={assetCandles}
                  supportLevels={supportLevelsOnChart}
                  resistanceLevels={resistanceLevelsOnChart}
                  precision={asset.pricePrecision}
                />
              </div>
              <PriceLevels asset={asset} priceLevels={assetPriceLevels} />
            </>
          ) : (
            <Loader />
          )}
        </div>

        <div className="flex flex-col gap-4 w-80 p-4 bg-base-200 rounded-lg">
          <div>
            <label className="font-medium block mb-2" htmlFor="timeFrameSelector">
              Timeframe:
            </label>
            <TimeframeSelector selectedTimeFrame={timeframe} setSelectedTimeFrame={setTimeframe} />
          </div>

          <div>
            <label className="font-medium block mb-2" htmlFor="minStrength">
              Minimum strength:
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              min="0"
              step="1"
              value={minStrength}
              onChange={(e) => setMinStrength(parseInt(e.target.value))}
            />
          </div>

          <AssetSelector
            assets={assetList}
            selectedAssetSymbol={assetSymbol}
            onAssetSelect={setAssetSymbol}
            isLoading={isAssetsLoading}
          />
        </div>
      </div>
    </div>
  );
};
