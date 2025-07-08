import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { dayjs } from '../../../shared/utils/daytime';
import { TMRReport } from '../../../shared/types';

export const ReportsHistogram = ({ reports }: { reports: TMRReport[] }) => {
  if (!reports || reports.length === 0) {
    return null;
  }

  const chartData = reports
    .sort((a, b) => a.date - b.date)
    .map((report) => ({
      id: report.id,
      date: dayjs(report.date).format('DD/MM HH:mm'),
      pairsCount: report.pairsCount ?? 0,
    }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          onClick={(data) => {
            if (data && data.activeIndex) {
              const itemIndex = data.activeIndex as number;
              const item = chartData[itemIndex];
              if (item && item.id) {
                window.open(`/mrReport/${item.id}`, '_blank');
              }
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--fallback-b2,oklch(var(--b2)))',
              border: '1px solid var(--fallback-bc,oklch(var(--bc)))',
              borderRadius: '0.5rem',
              color: 'var(--fallback-bc,oklch(var(--bc)))',
            }}
            formatter={(value: number) => [value, 'Total Pairs']}
          />
          <Bar
            dataKey="pairsCount"
            fill="var(--fallback-p,oklch(var(--p)))"
            radius={[2, 2, 2, 2]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
