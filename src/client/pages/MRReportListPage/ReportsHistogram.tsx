import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { dayjs } from '../../../shared/utils/daytime';
import { TMRReport } from '../../../shared/types';

export const ReportsHistogram = ({ reports }: { reports: TMRReport[] }) => {
  if (!reports || reports.length === 0) {
    return null;
  }

  const chartData = (() => {
    const groupedData = reports.reduce(
      (acc, item) => {
        const dateKey = dayjs(item.date).format('DD.MM.YYYY HH:mm');

        if (!acc[dateKey]) {
          acc[dateKey] = {
            id: item.id,
            time: dateKey,
            totalPairs: 0,
            reportsCount: 0,
            date: item.date,
          };
        }
        acc[dateKey].totalPairs += item.dataCount;
        acc[dateKey].reportsCount += 1;
        return acc;
      },
      {} as Record<
        string,
        { id: string; time: string; totalPairs: number; reportsCount: number; date: number }
      >,
    );

    return Object.values(groupedData)
      .sort((a, b) => a.date - b.date)
      .map((item) => ({
        id: item.id,
        date: dayjs(item.date).format('DD/MM HH:mm'),
        totalPairs: item.totalPairs,
        fullDate: item.time,
      }));
  })();

  return (
    <div className="w-full h-64 bg-base-200 rounded p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          onClick={(data) => {
            if (data && data.activeLabel) {
              const clickedItem = chartData.find((item) => item.date === data.activeLabel);
              if (clickedItem && clickedItem.id) {
                window.open(`/mrReport/${clickedItem.id}`, '_blank');
              }
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'currentColor' }}
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
            labelFormatter={(label: string) => {
              const item = chartData.find((d) => d.date === label);
              return item ? item.fullDate : label;
            }}
          />
          <Bar
            dataKey="totalPairs"
            fill="var(--fallback-p,oklch(var(--p)))"
            radius={[2, 2, 2, 2]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
