import React, { useEffect, useRef } from 'react';
import { createChart, LineSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

import { getColorForStrength } from './colors';
import { TKline } from '../../trading/types';

type Level = {
  price: number;
  strength: number;
};

type Props = {
  klines: TKline[];
  supportLevels: Level[];
  resistanceLevels: Level[];
};

export const PriceLevelsChart = ({ klines, supportLevels, resistanceLevels }: Props) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || klines.length === 0) {
      return;
    }

    const chartContainer = chartContainerRef.current;
    const chart = createChart(chartContainer, {
      layout: {
        textColor: '#f8f8f2',
        background: { color: '#282a36' },
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
    });

    const mainSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#50fa7b',
      downColor: '#ff5555',
      borderUpColor: '#50fa7b',
      borderDownColor: '#ff5555',
      wickUpColor: '#50fa7b',
      wickDownColor: '#ff5555',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#bd93f9',
      priceScaleId: 'volume',
      priceFormat: {
        type: 'volume',
      },
      overlay: true,
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      visible: true,
    });

    const candleData = klines.map((kline) => {
      return {
        time: kline.openTime,
        open: parseFloat(kline.open),
        high: parseFloat(kline.high),
        low: parseFloat(kline.low),
        close: parseFloat(kline.close),
      };
    });

    const volumeData = klines.map((kline) => {
      const isGreen = parseFloat(kline.close) >= parseFloat(kline.open);
      return {
        time: kline.openTime,
        value: parseFloat(kline.volume),
        color: isGreen ? 'rgba(80, 250, 123, 0.5)' : 'rgba(255, 85, 85, 0.5)',
      };
    });

    mainSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    const startTime = candleData[0].time;
    const endTime = candleData[candleData.length - 1].time;

    supportLevels.forEach((level) => {
      const supportLine = chart.addSeries(LineSeries, {
        color: getColorForStrength(level.strength),
        lineWidth: 1,
        lineStyle: 0,
        title: `${level.strength.toFixed(0)}`,
        lastValueVisible: true,
      });

      supportLine.setData([
        { time: startTime, value: level.price },
        { time: endTime, value: level.price },
      ]);
    });

    resistanceLevels.forEach((level) => {
      const supportLine = chart.addSeries(LineSeries, {
        color: getColorForStrength(level.strength),
        lineWidth: 1,
        lineStyle: 0,
        title: `${level.strength.toFixed(0)}`,
        lastValueVisible: true,
      });

      supportLine.setData([
        { time: startTime, value: level.price },
        { time: endTime, value: level.price },
      ]);
    });

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
  }, [klines, supportLevels, resistanceLevels]);

  return <div ref={chartContainerRef} className="w-full h-[500px] bg-[#282a36]"></div>;
};
