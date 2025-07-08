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

type ChartDataItem = {
  id: number;
  date: string;
  fullDate: string;
  profitability: number;
  tradesCount: number;
  status: 'no-backtest' | 'no-trades' | 'profitable' | 'unprofitable';
};

export const ReportsBacktestHistogram = ({ reports }: { reports: TMRReport[] }) => {
  if (!reports || reports.length === 0) {
    return null;
  }

  const chartData: ChartDataItem[] = reports
    .sort((a, b) => a.date - b.date)
    .map((report) => {
      const { backtestTrades } = report;

      const chartItem: ChartDataItem = {
        id: report.id,
        date: dayjs(report.date).format('DD/MM HH:mm'),
        fullDate: dayjs(report.date).format('DD.MM.YYYY HH:mm'),
        profitability: 0,
        tradesCount: 0,
        status: 'no-backtest',
      };

      // Случай 1: бэктест не проведён
      if (!backtestTrades) {
        return chartItem;
      }

      // Случай 2: бэктест проведён, но сделок нет
      if (backtestTrades.length === 0) {
        chartItem.status = 'no-trades';
        return chartItem;
      }

      // Случай 3: бэктест проведён и есть сделки
      const totalProfitability = backtestTrades.reduce((sum, trade) => sum + trade.roi, 0);

      chartItem.profitability = totalProfitability;
      chartItem.tradesCount = backtestTrades.length;
      chartItem.status = totalProfitability >= 0 ? 'profitable' : 'unprofitable';

      return chartItem;
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
        <div className="bg-base-200 border border-base-content rounded-lg px-3 py-2 text-base-content">
          <p className="m-0 mb-1 text-sm font-bold">{data.fullDate}</p>
          <p className="m-0 mb-0.5">
            <span>Profitability: </span>
            <span style={{ color: textColor }} className="font-bold">
              {formatTooltipValue(data)}
            </span>
          </p>
          <p className="m-0 text-xs opacity-80">{formatTradesCount(data)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          onClick={(data) => {
            if (data && data.activeLabel) {
              const clickedItem = chartData.find((item) => item.date === data.activeLabel);
              if (clickedItem && clickedItem.id) {
                window.open(`/mrReport/${clickedItem.id}/backtest`, '_blank');
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
            domain={yAxisDomain}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="currentColor" opacity={0.2} />
          <Bar dataKey="profitability" radius={[2, 2, 2, 2]} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
