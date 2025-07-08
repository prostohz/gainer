import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { http } from '../../shared/utils/http';
import { Loader } from '../../shared/ui/Loader';

type ChartDataItem = {
  score: number;
  tradesCount: number;
  averageRoi: number;
  totalRoi: number;
  minRoi: number;
  maxRoi: number;
};

type MetricOption = {
  value: keyof Omit<ChartDataItem, 'score'>;
  label: string;
  formatter: (value: number) => string;
};

const metricOptions: MetricOption[] = [
  {
    value: 'tradesCount',
    label: 'Trades Count',
    formatter: (value) => Math.round(value).toString(),
  },
  { value: 'averageRoi', label: 'Average ROI', formatter: (value) => `${value.toFixed(2)}%` },
  { value: 'totalRoi', label: 'Total ROI', formatter: (value) => `${value.toFixed(2)}%` },
  { value: 'minRoi', label: 'Min ROI', formatter: (value) => `${value.toFixed(2)}%` },
  { value: 'maxRoi', label: 'Max ROI', formatter: (value) => `${value.toFixed(2)}%` },
];

export const BacktestTradesByPairScore = () => {
  const [selectedMetric, setSelectedMetric] = useState<MetricOption>(metricOptions[1]); // По умолчанию averageRoi
  const { data: tradesByPairScore, isLoading } = useQuery<
    Array<{
      score: number;
      tradesCount: number;
      averageRoi: number;
      totalRoi: number;
      minRoi: number;
      maxRoi: number;
    }>
  >({
    queryKey: ['tradesByPairScore'],
    queryFn: () => http.get('/api/mrReport/analytics/tradesByPairScore').then((res) => res.data),
  });

  if (isLoading) {
    return <Loader />;
  }

  if (!tradesByPairScore || tradesByPairScore.length === 0) {
    return (
      <div className="w-full h-64 bg-base-200 rounded p-4 flex items-center justify-center">
        <span className="text-base-content opacity-60">No data to display</span>
      </div>
    );
  }

  const chartData = [...tradesByPairScore].sort((a, b) => a.score - b.score);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataItem }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-base-200 border border-base-content rounded-lg p-3 text-base-content">
          <p className="m-0 mb-1 text-sm font-bold">Score: {data.score.toFixed(2)}</p>
          <p className="m-0 mb-0.5">
            <span>Average ROI: </span>
            <span className={`font-bold ${data.averageRoi >= 0 ? 'text-success' : 'text-error'}`}>
              {data.averageRoi.toFixed(2)}%
            </span>
          </p>
          <p className="m-0 mb-0.5">
            <span>Total ROI: </span>
            <span className={`font-bold ${data.totalRoi >= 0 ? 'text-success' : 'text-error'}`}>
              {data.totalRoi.toFixed(2)}%
            </span>
          </p>
          <p className="m-0 mb-0.5">
            <span>Min ROI: </span>
            <span className={`font-bold ${data.minRoi >= 0 ? 'text-success' : 'text-error'}`}>
              {data.minRoi.toFixed(2)}%
            </span>
          </p>
          <p className="m-0 mb-0.5">
            <span>Max ROI: </span>
            <span className={`font-bold ${data.maxRoi >= 0 ? 'text-success' : 'text-error'}`}>
              {data.maxRoi.toFixed(2)}%
            </span>
          </p>
          <p className="m-0">
            <span>Trades count: </span>
            <span className="font-bold">{data.tradesCount}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Определяем диапазон Y-axis для выбранной метрики
  const metricValues = chartData.map((item) => item[selectedMetric.value]);
  const minValue = Math.min(...metricValues);
  const maxValue = Math.max(...metricValues);
  const valueRange = maxValue - minValue;
  const yAxisDomain = [minValue - valueRange * 0.1, maxValue + valueRange * 0.1]; // Добавляем 10% отступа

  return (
    <div>
      <div className="flex justify-between items-center h-6 mb-2">
        <h3 className="text-sm font-semibold text-base-content">Trades By Pair Score</h3>
        <select
          value={selectedMetric.value}
          onChange={(e) => {
            const selected = metricOptions.find((option) => option.value === e.target.value);
            if (selected) setSelectedMetric(selected);
          }}
          className="select select-bordered select-xs"
        >
          {metricOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full h-64 bg-base-300 rounded p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
            <XAxis
              dataKey="score"
              tick={{ fontSize: 10, fill: 'currentColor' }}
              axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'currentColor' }}
              axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
              domain={yAxisDomain}
              tickFormatter={selectedMetric.formatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={selectedMetric.value} radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    selectedMetric.value === 'tradesCount'
                      ? 'var(--fallback-in,oklch(var(--in)))'
                      : entry[selectedMetric.value] >= 0
                        ? 'var(--fallback-su,oklch(var(--su)))'
                        : 'var(--fallback-er,oklch(var(--er)))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
