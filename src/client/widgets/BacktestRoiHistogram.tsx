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

import { TCompleteTrade } from '../../server/trading/strategies/MRStrategy/backtest';

type ChartDataItem = {
  range: string;
  rangeLabel: string;
  tradesCount: number;
  minRoi: number;
  maxRoi: number;
  status: 'profitable' | 'unprofitable';
};

export const BacktestRoiHistogram = ({ trades }: { trades: TCompleteTrade[] }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="w-full h-64 bg-base-200 rounded p-4 flex items-center justify-center">
        <span className="text-base-content opacity-60">No data to display</span>
      </div>
    );
  }

  // Определяем диапазоны ROI для группировки
  const roiValues = trades.map((trade) => trade.roi);
  const minRoi = Math.min(...roiValues);
  const maxRoi = Math.max(...roiValues);

  // Создаем 20 равных диапазонов
  const binCount = 200;
  const binSize = (maxRoi - minRoi) / binCount;

  // Группируем сделки по диапазонам
  const bins = new Map<number, TCompleteTrade[]>();

  // Инициализируем все bins
  for (let i = 0; i < binCount; i++) {
    bins.set(i, []);
  }

  // Распределяем сделки по bins
  trades.forEach((trade) => {
    let binIndex = Math.floor((trade.roi - minRoi) / binSize);
    // Если ROI равен максимальному значению, помещаем в последний bin
    if (binIndex >= binCount) {
      binIndex = binCount - 1;
    }
    bins.get(binIndex)?.push(trade);
  });

  // Создаем данные для чарта
  const chartData: ChartDataItem[] = Array.from(bins.entries()).map(([binIndex, binTrades]) => {
    const binMinRoi = minRoi + binIndex * binSize;
    const binMaxRoi = minRoi + (binIndex + 1) * binSize;
    const binCenterRoi = (binMinRoi + binMaxRoi) / 2;

    return {
      range: `${binMinRoi.toFixed(2)}-${binMaxRoi.toFixed(2)}`,
      rangeLabel: `${binCenterRoi.toFixed(2)}%`,
      tradesCount: binTrades.length,
      minRoi: binMinRoi,
      maxRoi: binMaxRoi,
      status: binCenterRoi >= 0 ? 'profitable' : 'unprofitable',
    };
  });

  const getBarColor = (status: ChartDataItem['status']) => {
    switch (status) {
      case 'profitable':
        return 'var(--fallback-su,oklch(var(--su)))'; // success/green
      case 'unprofitable':
        return 'var(--fallback-er,oklch(var(--er)))'; // error/red
      default:
        return 'var(--fallback-n,oklch(var(--n)))';
    }
  };

  const getTextColor = (status: ChartDataItem['status']) => {
    switch (status) {
      case 'profitable':
        return '#10b981'; // green-500
      case 'unprofitable':
        return '#ef4444'; // red-500
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
            ROI Range: {data.minRoi.toFixed(2)}% – {data.maxRoi.toFixed(2)}%
          </p>
          <p style={{ margin: 0, marginBottom: '2px' }}>
            <span>Trades: </span>
            <span style={{ color: textColor, fontWeight: 'bold' }}>{data.tradesCount}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Максимальное количество сделок для настройки Y-axis
  const maxTradesCount = Math.max(...chartData.map((item) => item.tradesCount));
  const yAxisDomain = [0, maxTradesCount * 1.1]; // Добавляем 10% отступа

  return (
    <div className="w-full h-64 bg-base-300 rounded p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
          <XAxis
            dataKey="rangeLabel"
            tick={{ fontSize: 10, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
            domain={yAxisDomain}
            tickFormatter={(value) => Math.round(value).toString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x="0.00%" stroke="currentColor" opacity={0.5} strokeDasharray="2 2" />
          <Bar dataKey="tradesCount" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
