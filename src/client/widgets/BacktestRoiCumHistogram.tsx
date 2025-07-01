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

import { TCompleteTrade } from '../../server/trading/strategies/MRStrategy/backtest';

type TBacktestRoiCumHistogramProps = {
  trades: TCompleteTrade[];
};

type ChartDataItem = {
  roi: number;
  roiLabel: string;
  cumulativeCount: number;
  cumulativePercentage: number;
  totalTrades: number;
  status: 'profitable' | 'unprofitable';
  unprofitableCount: number;
  profitableCount: number;
};

export const BacktestRoiCumHistogram = ({ trades }: TBacktestRoiCumHistogramProps) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="w-full h-64 bg-base-200 rounded p-4 flex items-center justify-center">
        <span className="text-base-content opacity-60">No data to display</span>
      </div>
    );
  }

  // Сортируем сделки по ROI по возрастанию
  const sortedTrades = [...trades].sort((a, b) => a.roi - b.roi);

  // Определяем диапазоны ROI для группировки
  const roiValues = sortedTrades.map((trade) => trade.roi);
  const minRoi = Math.min(...roiValues);
  const maxRoi = Math.max(...roiValues);

  // Создаем равные диапазоны для накопительного распределения
  const binCount = 200; // Меньше bins для более гладкой кривой
  const binSize = (maxRoi - minRoi) / binCount;

  // Создаем данные для накопительной диаграммы
  const chartData: ChartDataItem[] = [];
  const totalTrades = trades.length;

  // Подсчитываем общее количество убыточных сделок
  const totalUnprofitableTrades = sortedTrades.filter((trade) => trade.roi < 0).length;

  for (let i = 0; i <= binCount; i++) {
    const currentRoi = minRoi + i * binSize;

    // Подсчитываем количество сделок с ROI <= currentRoi
    const cumulativeCount = sortedTrades.filter((trade) => trade.roi <= currentRoi).length;
    const cumulativePercentage = (cumulativeCount / totalTrades) * 100;

    let unprofitableCount: number;
    let profitableCount: number;

    if (currentRoi < 0) {
      // Для убыточных диапазонов показываем только накопительное количество убыточных сделок
      unprofitableCount = cumulativeCount;
      profitableCount = 0;
    } else {
      // Для прибыльных диапазонов показываем фиксированное количество убыточных + накопительное прибыльных
      unprofitableCount = totalUnprofitableTrades;
      profitableCount = sortedTrades.filter(
        (trade) => trade.roi >= 0 && trade.roi <= currentRoi,
      ).length;
    }

    chartData.push({
      roi: currentRoi,
      roiLabel: `${currentRoi.toFixed(2)}%`,
      cumulativeCount,
      cumulativePercentage,
      totalTrades,
      status: currentRoi >= 0 ? 'profitable' : 'unprofitable',
      unprofitableCount,
      profitableCount,
    });
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
            ROI: {data.roi.toFixed(2)}%
          </p>
          <p style={{ margin: 0, marginBottom: '2px' }}>
            <span>Unprofitable trades: </span>
            <span style={{ color: 'var(--fallback-er,oklch(var(--er)))', fontWeight: 'bold' }}>
              {data.unprofitableCount}
            </span>
          </p>
          <p style={{ margin: 0, marginBottom: '2px' }}>
            <span>Profitable trades: </span>
            <span style={{ color: 'var(--fallback-su,oklch(var(--su)))', fontWeight: 'bold' }}>
              {data.profitableCount}
            </span>
          </p>
          <p style={{ margin: 0, marginBottom: '2px' }}>
            <span>Total ≤ ROI: </span>
            <span style={{ color: 'var(--fallback-p,oklch(var(--p)))', fontWeight: 'bold' }}>
              {data.cumulativeCount} ({data.cumulativePercentage.toFixed(3)}%)
            </span>
          </p>
          <p style={{ margin: 0, marginBottom: '2px' }}>
            <span>Total ≥ ROI: </span>
            <span style={{ color: 'var(--fallback-p,oklch(var(--p)))', fontWeight: 'bold' }}>
              {data.totalTrades - data.cumulativeCount} (
              {(100 - data.cumulativePercentage).toFixed(3)}%)
            </span>
          </p>
          <p style={{ margin: 0 }}>
            <span>Total trades: </span>
            <span>{data.totalTrades}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Находим точку, где 50% сделок имеют ROI <= значения (медиана)
  const medianPoint = chartData.find((item) => item.cumulativePercentage >= 50);
  const breakEvenPoint = chartData.find((item) => item.roi >= 0);

  return (
    <div className="w-full h-64 bg-base-300 rounded p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.3} />
          <XAxis
            dataKey="roiLabel"
            tick={{ fontSize: 10, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
            domain={[0, totalTrades]}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Линия медианы (50% сделок) */}
          {medianPoint && (
            <ReferenceLine
              x={medianPoint.roiLabel}
              stroke="var(--fallback-wa,oklch(var(--wa)))"
              strokeDasharray="5 5"
              opacity={0.7}
            />
          )}

          {/* Линия breakeven (ROI = 0%) */}
          {breakEvenPoint && (
            <ReferenceLine
              x={breakEvenPoint.roiLabel}
              stroke="var(--fallback-n,oklch(var(--n)))"
              strokeDasharray="2 2"
              opacity={0.5}
            />
          )}

          {/* Горизонтальная линия 50% */}
          <ReferenceLine
            y={totalTrades / 2}
            stroke="var(--fallback-wa,oklch(var(--wa)))"
            strokeDasharray="5 5"
            opacity={0.7}
          />

          <Bar
            dataKey="unprofitableCount"
            stackId="trades"
            fill="var(--fallback-er,oklch(var(--er)))"
            opacity={0.8}
            radius={[0, 0, 0, 0]}
            style={{ filter: 'none' }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="profitableCount"
            stackId="trades"
            fill="var(--fallback-su,oklch(var(--su)))"
            opacity={0.8}
            radius={[2, 2, 0, 0]}
            style={{ filter: 'none' }}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
