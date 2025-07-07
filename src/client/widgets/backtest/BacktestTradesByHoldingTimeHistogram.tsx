import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';
import { dayjs } from '../../../shared/utils/daytime';

type ChartDataItem = {
  range: string;
  rangeLabel: string;
  avgRoi: number;
  tradesCount: number;
  profitableCount: number;
  unprofitableCount: number;
  minHoldingTime: number;
  maxHoldingTime: number;
};

const formatHoldingTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
};

export const BacktestTradesByHoldingTimeHistogram = ({ trades }: { trades: TCompleteTrade[] }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="w-full h-64 bg-base-200 rounded p-4 flex items-center justify-center">
        <span className="text-base-content opacity-60">No data to display</span>
      </div>
    );
  }

  // Вычисляем время удержания для каждой сделки
  const tradesWithHoldingTime = trades.map((trade) => ({
    ...trade,
    holdingTime: trade.closeTime - trade.openTime,
  }));

  // Определяем диапазоны времени удержания для группировки
  const holdingTimes = tradesWithHoldingTime.map((trade) => trade.holdingTime);
  const minHoldingTime = Math.min(...holdingTimes);
  const maxHoldingTime = Math.max(...holdingTimes);

  const binCount = Math.ceil(dayjs(maxHoldingTime).diff(dayjs(minHoldingTime), 'second') / 60) * 6;
  const binSize = (1000 * 60) / 6;

  // Группируем сделки по диапазонам времени удержания
  const bins = new Map<number, typeof tradesWithHoldingTime>();

  // Инициализируем все bins
  for (let i = 0; i < binCount; i++) {
    bins.set(i, []);
  }

  // Распределяем сделки по bins
  tradesWithHoldingTime.forEach((trade) => {
    let binIndex = Math.floor((trade.holdingTime - minHoldingTime) / binSize);
    // Если время удержания равно максимальному значению, помещаем в последний bin
    if (binIndex >= binCount) {
      binIndex = binCount - 1;
    }
    bins.get(binIndex)?.push(trade);
  });

  // Создаем данные для чарта
  const chartData: ChartDataItem[] = Array.from(bins.entries())
    .map(([binIndex, binTrades]) => {
      const binMinHoldingTime = minHoldingTime + binIndex * binSize;
      const binMaxHoldingTime = minHoldingTime + (binIndex + 1) * binSize;
      const binCenterHoldingTime = (binMinHoldingTime + binMaxHoldingTime) / 2;

      if (binTrades.length === 0) {
        return null;
      }

      // Вычисляем средний ROI для данного диапазона времени удержания
      const avgRoi = binTrades.reduce((sum, trade) => sum + trade.roi, 0) / binTrades.length;

      // Подсчитываем прибыльные и убыточные сделки
      const profitableCount = binTrades.filter((trade) => trade.roi >= 0).length;
      const unprofitableCount = binTrades.filter((trade) => trade.roi < 0).length;

      return {
        range: `${formatHoldingTime(binMinHoldingTime)}-${formatHoldingTime(binMaxHoldingTime)}`,
        rangeLabel: formatHoldingTime(binCenterHoldingTime),
        avgRoi,
        tradesCount: binTrades.length,
        profitableCount,
        unprofitableCount,
        minHoldingTime: binMinHoldingTime,
        maxHoldingTime: binMaxHoldingTime,
      };
    })
    .filter(Boolean) as ChartDataItem[];

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataItem }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      const profitablePercentage = (data.profitableCount / data.tradesCount) * 100;
      const unprofitablePercentage = (data.unprofitableCount / data.tradesCount) * 100;

      return (
        <div className="bg-base-200 border border-base-content rounded-lg p-3 text-base-content">
          <p className="m-0 mb-1 text-sm font-bold">
            Holding Time: {formatHoldingTime(data.minHoldingTime)} –{' '}
            {formatHoldingTime(data.maxHoldingTime)}
          </p>
          <p className="m-0 mb-0.5">
            <span>Avg ROI: </span>
            <span className={`font-bold ${data.avgRoi >= 0 ? 'text-success' : 'text-error'}`}>
              {data.avgRoi.toFixed(2)}%
            </span>
          </p>
          <p className="m-0 mb-0.5">
            <span>Profitable trades: </span>
            <span className="text-success font-bold">
              {data.profitableCount} ({profitablePercentage.toFixed(1)}%)
            </span>
          </p>
          <p className="m-0 mb-0.5">
            <span>Unprofitable trades: </span>
            <span className="text-error font-bold">
              {data.unprofitableCount} ({unprofitablePercentage.toFixed(1)}%)
            </span>
          </p>
          <p className="m-0">
            <span>Total trades: </span>
            <span className="font-bold">{data.tradesCount}</span>
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
          <Bar
            dataKey="unprofitableCount"
            stackId="trades"
            fill="var(--fallback-er,oklch(var(--er)))"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="profitableCount"
            stackId="trades"
            fill="var(--fallback-su,oklch(var(--su)))"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
