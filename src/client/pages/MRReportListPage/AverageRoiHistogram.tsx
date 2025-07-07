import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { dayjs } from '../../../shared/utils/daytime';
import { TMRReport } from '../../../shared/types';
import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';

type ChartDataItem = {
  date: string;
  fullDate: string;
  timestamp: number;
  cumulativeAvgRoi: number;
  tradesCount: number;
};

export const AverageRoiHistogram = ({ reports }: { reports: TMRReport[] }) => {
  const chartData: ChartDataItem[] = useMemo(() => {
    if (!reports || reports.length === 0) {
      return [];
    }

    const sortedReports = reports
      .filter(({ backtestTrades }) => backtestTrades && backtestTrades.length > 0)
      .sort((a, b) => a.date - b.date);

    if (sortedReports.length === 0) {
      return [];
    }

    const data: ChartDataItem[] = [];

    sortedReports.forEach((report, index) => {
      const allTrades: TCompleteTrade[] = [];
      for (let i = 0; i <= index; i++) {
        const { backtestTrades } = sortedReports[i];

        if (backtestTrades) {
          allTrades.push(...backtestTrades);
        }
      }

      const totalRoi = allTrades.reduce((sum, trade) => sum + trade.roi, 0);
      const avgRoi = totalRoi / allTrades.length;

      data.push({
        date: dayjs(report.date).format('DD/MM HH:mm'),
        fullDate: dayjs(report.date).format('DD.MM.YYYY HH:mm'),
        timestamp: report.date,
        cumulativeAvgRoi: avgRoi,
        tradesCount: allTrades.length,
      });
    });

    return data;
  }, [reports]);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-64 bg-base-200 rounded p-4 flex items-center justify-center">
        <p className="text-base-content/60">No data to display</p>
      </div>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataItem }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      const isPositive = data.cumulativeAvgRoi >= 0;

      return (
        <div className="bg-base-200 border border-base-300 rounded-lg p-3 text-base-content shadow-lg">
          <p className="m-0 mb-1 text-sm font-bold">{data.fullDate}</p>
          <p className="m-0 mb-0.5 text-sm">
            <span>Средняя доходность: </span>
            <span className={`font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
              {data.cumulativeAvgRoi.toFixed(4)}%
            </span>
          </p>
          <p className="m-0 text-xs opacity-80">{data.tradesCount} сделок</p>
        </div>
      );
    }
    return null;
  };

  const lineColor =
    chartData[chartData.length - 1]?.cumulativeAvgRoi >= 0
      ? 'var(--fallback-su,oklch(var(--su)))'
      : 'var(--fallback-er,oklch(var(--er)))';

  return (
    <div className="w-full h-64 bg-base-200 rounded p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
            tickFormatter={(value) => `${value.toFixed(2)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="currentColor" opacity={0.2} />
          <Line
            type="monotone"
            dataKey="cumulativeAvgRoi"
            stroke={lineColor}
            strokeWidth={1}
            isAnimationActive={false}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
