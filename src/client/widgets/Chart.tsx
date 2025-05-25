import { useEffect, useRef } from 'react';
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  HistogramSeries,
  UTCTimestamp,
} from 'lightweight-charts';

import { Candle } from '../../server/models/Candle';
import { getColorForStrength } from '../pages/AssetPriceLevelsPage/colors';

type Level = {
  price: number;
  strength: number;
};

type Props = {
  candles: Candle[];
  precision: number;
  supportLevels?: Level[];
  resistanceLevels?: Level[];
};

export const Chart = ({ candles, supportLevels, resistanceLevels, precision }: Props) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) {
      return;
    }

    const chartContainer = chartContainerRef.current;
    const chart = createChart(chartContainer, {
      layout: {
        textColor: '#f8f8f2',
        background: { color: '#242530' },
      },
      grid: {
        vertLines: { color: 'rgba(68, 71, 90, 0.2)' },
        horzLines: { color: 'rgba(68, 71, 90, 0.2)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(189, 147, 249, 0.3)',
          width: 1,
          style: 0, // 0 = solid line
        },
        horzLine: {
          color: 'rgba(189, 147, 249, 0.3)',
          width: 1,
          style: 0, // 0 = solid line
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(68, 71, 90, 0.5)',
      },
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleString();
        },
      },
    });

    const mainSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#50fa7b',
      downColor: '#ff5555',
      borderUpColor: '#50fa7b',
      borderDownColor: '#ff5555',
      wickUpColor: '#50fa7b',
      wickDownColor: '#ff5555',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(precision),
        minMove: 1 / Math.pow(10, precision),
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#bd93f9',
      priceScaleId: 'volume',
      priceFormat: {
        type: 'volume',
      },
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      visible: true,
    });

    const candleData = candles.map((candle) => ({
      time: (candle.openTime / 1000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const volumeData = candles.map((candle) => {
      const isGreen = candle.close >= candle.open;
      return {
        time: (candle.openTime / 1000) as UTCTimestamp,
        value: candle.volume,
        color: isGreen ? 'rgba(80, 250, 123, 0.5)' : 'rgba(255, 85, 85, 0.5)',
      };
    });

    mainSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    const startTime = candleData[0].time;
    const endTime = candleData[candleData.length - 1].time;

    if (supportLevels) {
      supportLevels.forEach((level) => {
        const supportLine = chart.addSeries(LineSeries, {
          color: getColorForStrength(level.strength),
          lineWidth: 1,
          lineStyle: 0,
          title: `${level.strength}`,
          lastValueVisible: true,
          priceFormat: {
            type: 'price',
            precision,
          },
        });

        supportLine.setData([
          { time: startTime as UTCTimestamp, value: level.price },
          { time: endTime as UTCTimestamp, value: level.price },
        ]);
      });
    }

    if (resistanceLevels) {
      resistanceLevels.forEach((level) => {
        const supportLine = chart.addSeries(LineSeries, {
          color: getColorForStrength(level.strength),
          lineWidth: 1,
          lineStyle: 0,
          title: `${level.strength}`,
          lastValueVisible: true,
          priceFormat: {
            type: 'price',
            precision,
          },
        });

        supportLine.setData([
          { time: startTime as UTCTimestamp, value: level.price },
          { time: endTime as UTCTimestamp, value: level.price },
        ]);
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, supportLevels, resistanceLevels]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full h-full bg-[#282a36] rounded-lg overflow-hidden"
    />
  );
};
