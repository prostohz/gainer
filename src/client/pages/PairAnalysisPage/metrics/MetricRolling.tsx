import { useEffect, useRef } from 'react';
import { createChart, LineSeries, UTCTimestamp } from 'lightweight-charts';
import * as R from 'remeda';

type TProps = {
  data?: { timestamp: number; value: number | null }[];
  colors: Record<string, string>;
};

export const MetricRolling = ({ data = [], colors }: TProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) {
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
          style: 0,
        },
        horzLine: {
          color: 'rgba(189, 147, 249, 0.3)',
          width: 1,
          style: 0,
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
      height: 300,
    });

    // Создаем основную линию с данными
    const mainSeries = chart.addSeries(LineSeries, {
      color: '#ff79c6',
      lineWidth: 1,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(4),
        minMove: 0.0001,
      },
    });

    // Преобразуем данные для графика
    const chartData = data.map((item) => ({
      time: (item.timestamp / 1000) as UTCTimestamp,
      value: item.value ?? null,
    }));

    mainSeries.setData(chartData);

    // Добавляем горизонтальные линии для ключевых уровней из colors
    const colorLevels = R.pipe(
      R.keys(colors),
      R.map((key) => parseFloat(key)),
      R.filter((level) => !isNaN(level)),
      R.sortBy(R.identity()),
    );

    if (chartData.length > 0) {
      const startTime = chartData[0].time;
      const endTime = chartData[chartData.length - 1].time;

      colorLevels.forEach((level) => {
        const levelSeries = chart.addSeries(LineSeries, {
          color: colors[level.toString()],
          lineWidth: 1,
          lineStyle: 2, // пунктирная линия
          lastValueVisible: false,
          priceLineVisible: false,
        });

        levelSeries.setData([
          { time: startTime, value: level },
          { time: endTime, value: level },
        ]);
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainer.clientWidth,
        height: 300,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, colors]);

  if (data.length === 0) {
    return (
      <div className="w-full h-[300px] bg-[#282a36] rounded-lg flex items-center justify-center">
        <div className="text-neutral-content">No data to display</div>
      </div>
    );
  }

  return (
    <div
      ref={chartContainerRef}
      className="w-full h-[300px] bg-[#282a36] rounded-lg overflow-hidden"
    />
  );
};
