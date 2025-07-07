import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';

type ChartDataItem = {
  range: string;
  rangeLabel: string;
  avgRoi: number;
  tradesCount: number;
  profitableCount: number;
  unprofitableCount: number;
  minScore: number;
  maxScore: number;
};

export const BacktestTradesByPairScore = ({ trades }: { trades: TCompleteTrade[] }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="w-full h-64 bg-base-200 rounded p-4 flex items-center justify-center">
        <span className="text-base-content opacity-60">No data to display</span>
      </div>
    );
  }

  // Получаем все score для определения диапазонов
  // Для демонстрации используем случайные score от 0 до 100
  const scores = trades.map(() => Math.random() * 100);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // Определяем количество bins для группировки
  const binCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(trades.length))));
  const binSize = (maxScore - minScore) / binCount;

  // Группируем сделки по диапазонам score
  const bins = new Map<number, TCompleteTrade[]>();

  // Инициализируем все bins
  for (let i = 0; i < binCount; i++) {
    bins.set(i, []);
  }

  // Распределяем сделки по bins
  trades.forEach((trade, index) => {
    const tradeScore = scores[index];
    let binIndex = Math.floor((tradeScore - minScore) / binSize);
    // Если score равен максимальному значению, помещаем в последний bin
    if (binIndex >= binCount) {
      binIndex = binCount - 1;
    }
    bins.get(binIndex)?.push(trade);
  });

  // Создаем данные для чарта
  const chartData: ChartDataItem[] = Array.from(bins.entries())
    .map(([binIndex, binTrades]) => {
      const binMinScore = minScore + binIndex * binSize;
      const binMaxScore = minScore + (binIndex + 1) * binSize;
      const binCenterScore = (binMinScore + binMaxScore) / 2;

      if (binTrades.length === 0) {
        return null;
      }

      // Вычисляем средний ROI для данного диапазона score
      const avgRoi = binTrades.reduce((sum, trade) => sum + trade.roi, 0) / binTrades.length;

      // Подсчитываем прибыльные и убыточные сделки
      const profitableCount = binTrades.filter((trade) => trade.roi >= 0).length;
      const unprofitableCount = binTrades.filter((trade) => trade.roi < 0).length;

      return {
        range: `${binMinScore.toFixed(1)}-${binMaxScore.toFixed(1)}`,
        rangeLabel: binCenterScore.toFixed(1),
        avgRoi,
        tradesCount: binTrades.length,
        profitableCount,
        unprofitableCount,
        minScore: binMinScore,
        maxScore: binMaxScore,
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
            Pair Score: {data.minScore.toFixed(1)} – {data.maxScore.toFixed(1)}
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
