import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { TCompleteTrade } from '../../../server/trading/strategies/MeanReversionStrategy/backtest';

type TTradeDistributionChartsProps = {
  trades: TCompleteTrade[];
};

type MinuteDataItem = {
  minute: string;
  successful: number;
  unsuccessful: number;
  unsuccessfulNegative: number; // Отрицательное значение для отображения вниз
  total: number;
  time: string;
};

export const TradeDistributionCharts = ({ trades }: TTradeDistributionChartsProps) => {
  const distributionData = useMemo(() => {
    if (!trades.length) return null;

    // Находим диапазон времени всех сделок
    const allTimes = trades.map((trade) => new Date(trade.openTime));
    const minTime = new Date(Math.min(...allTimes.map((t) => t.getTime())));
    const maxTime = new Date(Math.max(...allTimes.map((t) => t.getTime())));

    // Создаем полный список всех минут в диапазоне
    const allMinutes: Record<string, { successful: number; unsuccessful: number; total: number }> =
      {};

    const currentTime = new Date(minTime);
    currentTime.setSeconds(0, 0); // Округляем до минуты

    while (currentTime <= maxTime) {
      const timeKey = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
      allMinutes[timeKey] = { successful: 0, unsuccessful: 0, total: 0 };
      currentTime.setMinutes(currentTime.getMinutes() + 1);
    }

    // Заполняем данными сделок
    trades.forEach((trade) => {
      const openDate = new Date(trade.openTime);
      const hours = openDate.getHours();
      const minutes = openDate.getMinutes();
      const timeKey = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      if (allMinutes[timeKey]) {
        if (trade.roi > 0) {
          allMinutes[timeKey].successful++;
        } else {
          allMinutes[timeKey].unsuccessful++;
        }
        allMinutes[timeKey].total++;
      }
    });

    // Преобразуем в массив для гистограммы
    const chartData: MinuteDataItem[] = Object.entries(allMinutes)
      .map(([timeKey, stats]) => ({
        minute: timeKey,
        successful: stats.successful,
        unsuccessful: stats.unsuccessful,
        unsuccessfulNegative: -stats.unsuccessful, // Отрицательное значение для отображения вниз
        total: stats.total,
        time: timeKey,
      }))
      .sort((a, b) => {
        const [aHours, aMinutes] = a.minute.split(':').map(Number);
        const [bHours, bMinutes] = b.minute.split(':').map(Number);
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
      });

    // Вычисляем границы для симметричной шкалы
    const maxValue = Math.max(...chartData.map((item) => item.successful));
    const minValue = Math.min(...chartData.map((item) => item.unsuccessfulNegative));
    const maxAbsValue = Math.max(maxValue, Math.abs(minValue));
    const yAxisDomain = [-maxAbsValue * 1.1, maxAbsValue * 1.1];

    return { chartData, yAxisDomain };
  }, [trades]);

  if (!distributionData) {
    return <div className="text-center p-4">Нет данных для отображения</div>;
  }

  const { chartData, yAxisDomain } = distributionData;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: MinuteDataItem }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div
          style={{
            backgroundColor: 'var(--fallback-b2,oklch(var(--b2)))',
            border: '1px solid var(--fallback-bc,oklch(var(--bc)))',
            borderRadius: '0.5rem',
            padding: '8px 12px',
            color: 'var(--fallback-bc,oklch(var(--bc)))',
          }}
        >
          <p style={{ margin: 0, marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            {data.time}
          </p>
          <p style={{ margin: 0, marginBottom: '2px', color: '#10b981' }}>
            Successful: {data.successful}
          </p>
          <p style={{ margin: 0, marginBottom: '2px', color: '#ef4444' }}>
            Unsuccessful: {data.unsuccessful}
          </p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Total: {data.total}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">
        Trade Distribution By Opening Time (Per Minute)
      </h3>

      <div className="w-full h-80 bg-base-300 rounded p-4 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.3} />
            <XAxis
              dataKey="minute"
              tick={{ fontSize: 10, fill: 'currentColor' }}
              axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'currentColor' }}
              axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
              domain={yAxisDomain}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={0}
              stroke="currentColor"
              strokeDasharray="5 5"
              opacity={0.6}
              strokeWidth={1}
            />
            {/* Успешные сделки - растут вверх */}
            <Bar
              dataKey="successful"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
              fill="#10b981"
              fillOpacity={0.8}
            />
            {/* Неуспешные сделки - растут вниз */}
            <Bar
              dataKey="unsuccessfulNegative"
              radius={[0, 0, 2, 2]}
              isAnimationActive={false}
              fill="#ef4444"
              fillOpacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
