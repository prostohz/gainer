import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

import { dayjs } from '../../../shared/utils/daytime';
import { TMRReport } from '../../../shared/types';

type TMRReportsBacktestHistogramProps = {
  reports: TMRReport[];
};

type ChartDataItem = {
  date: string;
  fullDate: string;
  profitability: number;
  tradesCount: number;
  status: 'no-backtest' | 'no-trades' | 'profitable' | 'unprofitable';
};

export const MRReportsBacktestHistogram = ({ reports }: TMRReportsBacktestHistogramProps) => {
  if (!reports || reports.length === 0) {
    return null;
  }

  const chartData: ChartDataItem[] = reports
    .sort((a, b) => a.date - b.date)
    .map((report) => {
      const backtest = report.backtest;

      // Случай 1: бэктест не проведён
      if (!backtest) {
        return {
          date: dayjs(report.date).format('DD/MM HH:mm'),
          fullDate: dayjs(report.date).format('DD.MM.YYYY HH:mm'),
          profitability: 0,
          tradesCount: 0,
          status: 'no-backtest' as const,
        };
      }

      // Случай 2: бэктест проведён, но сделок нет
      if (backtest.length === 0) {
        return {
          date: dayjs(report.date).format('DD/MM HH:mm'),
          fullDate: dayjs(report.date).format('DD.MM.YYYY HH:mm'),
          profitability: 0,
          tradesCount: 0,
          status: 'no-trades' as const,
        };
      }

      // Случай 3: бэктест проведён и есть сделки
      const totalProfitability = backtest.reduce((sum, trade) => sum + trade.roi, 0);

      return {
        date: dayjs(report.date).format('DD/MM HH:mm'),
        fullDate: dayjs(report.date).format('DD.MM.YYYY HH:mm'),
        profitability: totalProfitability,
        tradesCount: backtest.length,
        status: totalProfitability >= 0 ? ('profitable' as const) : ('unprofitable' as const),
      };
    });

  const getBarColor = (status: ChartDataItem['status']) => {
    switch (status) {
      case 'no-backtest':
        return 'var(--fallback-n,oklch(var(--n)))'; // neutral/gray
      case 'no-trades':
        return 'var(--fallback-wa,oklch(var(--wa)))'; // warning/orange
      case 'profitable':
        return 'var(--fallback-su,oklch(var(--su)))'; // success/green
      case 'unprofitable':
        return 'var(--fallback-er,oklch(var(--er)))'; // error/red
      default:
        return 'var(--fallback-n,oklch(var(--n)))';
    }
  };

  const formatTooltipValue = (item: ChartDataItem) => {
    switch (item.status) {
      case 'no-backtest':
        return 'N/A';
      case 'no-trades':
        return '0.00%';
      default:
        return `${item.profitability.toFixed(2)}%`;
    }
  };

  const formatTradesCount = (item: ChartDataItem) => {
    switch (item.status) {
      case 'no-backtest':
        return '-';
      case 'no-trades':
        return '0 trades';
      default:
        return `${item.tradesCount} trades`;
    }
  };

  // Вычисляем границы для симметричной шкалы вокруг нуля
  const profitabilityValues = chartData
    .filter((item) => item.status === 'profitable' || item.status === 'unprofitable')
    .map((item) => item.profitability);

  const maxAbsValue =
    profitabilityValues.length > 0 ? Math.max(...profitabilityValues.map(Math.abs)) : 1;

  const yAxisDomain = [-maxAbsValue * 1.1, maxAbsValue * 1.1]; // Добавляем 10% отступа

  const getTextColor = (status: ChartDataItem['status']) => {
    switch (status) {
      case 'profitable':
        return '#10b981'; // green-500
      case 'unprofitable':
        return '#ef4444'; // red-500
      case 'no-trades':
        return '#f59e0b'; // amber-500
      case 'no-backtest':
        return '#6b7280'; // gray-500
      default:
        return 'currentColor';
    }
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataItem }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      const textColor = getTextColor(data.status);

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
            {data.fullDate}
          </p>
          <p style={{ margin: 0, marginBottom: '2px' }}>
            <span>Profitability: </span>
            <span style={{ color: textColor, fontWeight: 'bold' }}>{formatTooltipValue(data)}</span>
          </p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>{formatTradesCount(data)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64 bg-base-200 rounded p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
            domain={yAxisDomain}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="currentColor" opacity={0.2} />
          <Bar
            dataKey="profitability"
            radius={[2, 2, 2, 2]}
            style={{ filter: 'none' }}
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.status)}
                opacity={0.8}
                style={{ filter: 'none' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
