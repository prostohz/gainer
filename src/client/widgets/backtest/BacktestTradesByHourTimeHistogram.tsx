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
import { useState } from 'react';

import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';
import { dayjs } from '../../../shared/utils/daytime';

type ChartDataItem = {
  interval: number;
  intervalLabel: string;
  avgRoi: number;
  totalRoi: number;
  tradesCount: number;
  profitableCount: number;
  unprofitableCount: number;
  totalProfitRoi: number;
  totalLossRoi: number;
  winRate: number;
};

type DisplayMode = 'trades' | 'averageRoi' | 'totalRoi' | 'winRate';

export const BacktestTradesByHourTimeHistogram = ({ trades }: { trades: TCompleteTrade[] }) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('trades');

  if (!trades || trades.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <span className="text-base-content opacity-60">No data to display</span>
      </div>
    );
  }

  const intervalMinutes = 1;
  const binsCount = 60;

  const intervalBins = new Map<number, TCompleteTrade[]>();

  for (let interval = 0; interval < binsCount; interval++) {
    intervalBins.set(interval, []);
  }

  trades.forEach((trade) => {
    const minutes = dayjs(trade.openTime).minute();
    const intervalIndex = Math.floor(minutes);
    intervalBins.get(intervalIndex)?.push(trade);
  });

  // Функция для форматирования интервала времени
  const formatInterval = (intervalIndex: number): string => {
    const totalMinutes = intervalIndex;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Создаем данные для чарта
  const chartData: ChartDataItem[] = Array.from(intervalBins.entries()).map(
    ([interval, intervalTrades]) => {
      if (intervalTrades.length === 0) {
        return {
          interval,
          intervalLabel: formatInterval(interval),
          avgRoi: 0,
          totalRoi: 0,
          tradesCount: 0,
          profitableCount: 0,
          unprofitableCount: 0,
          totalProfitRoi: 0,
          totalLossRoi: 0,
          winRate: 0,
        };
      }

      // Вычисляем средний ROI для данного интервала
      const avgRoi =
        intervalTrades.reduce((sum, trade) => sum + trade.roi, 0) / intervalTrades.length;

      // Подсчитываем прибыльные и убыточные сделки
      const profitableCount = intervalTrades.filter((trade) => trade.roi >= 0).length;
      const unprofitableCount = intervalTrades.filter((trade) => trade.roi < 0).length;

      // Суммируем ROI для прибыльных и убыточных сделок
      const totalProfitRoi = intervalTrades
        .filter((trade) => trade.roi >= 0)
        .reduce((sum, trade) => sum + trade.roi, 0);
      const totalLossRoi = Math.abs(
        intervalTrades.filter((trade) => trade.roi < 0).reduce((sum, trade) => sum + trade.roi, 0),
      );

      // Вычисляем общий ROI для данного интервала
      const totalRoi = intervalTrades.reduce((sum, trade) => sum + trade.roi, 0);

      // Вычисляем winRate (процент выигрышных сделок)
      const winRate =
        intervalTrades.length > 0 ? (profitableCount / intervalTrades.length) * 100 : 0;

      return {
        interval,
        intervalLabel: formatInterval(interval),
        avgRoi,
        totalRoi,
        tradesCount: intervalTrades.length,
        profitableCount,
        unprofitableCount,
        totalProfitRoi,
        totalLossRoi,
        winRate,
      };
    },
  );

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataItem }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;

      if (data.tradesCount === 0) {
        const nextInterval = formatInterval(data.interval + 1);
        return (
          <div className="bg-base-200 border border-base-content rounded-lg p-3 text-base-content">
            <p className="m-0 mb-1 text-sm font-bold">
              Time: {data.intervalLabel} - {nextInterval}
            </p>
            <p className="m-0">No trades</p>
          </div>
        );
      }

      const profitablePercentage = (data.profitableCount / data.tradesCount) * 100;
      const unprofitablePercentage = (data.unprofitableCount / data.tradesCount) * 100;
      const nextInterval = formatInterval(data.interval + 1);

      return (
        <div className="bg-base-200 border border-base-content rounded-lg p-3 text-base-content">
          <p className="m-0 mb-1 text-sm font-bold">
            Time: {data.intervalLabel} - {nextInterval}
          </p>
          {displayMode === 'trades' && (
            <p className="m-0 mb-0.5">
              <span>Avg ROI: </span>
              <span className={`font-bold ${data.avgRoi >= 0 ? 'text-success' : 'text-error'}`}>
                {data.avgRoi.toFixed(2)}%
              </span>
            </p>
          )}
          {displayMode === 'trades' ? (
            <>
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
            </>
          ) : displayMode === 'averageRoi' ? (
            <>
              <p className="m-0 mb-0.5">
                <span>Avg ROI: </span>
                <span className={`font-bold ${data.avgRoi >= 0 ? 'text-success' : 'text-error'}`}>
                  {data.avgRoi >= 0 ? '+' : ''}
                  {data.avgRoi.toFixed(2)}%
                </span>
              </p>
              <p className="m-0">
                <span>Total trades: </span>
                <span className="font-bold">{data.tradesCount}</span>
              </p>
            </>
          ) : displayMode === 'totalRoi' ? (
            <>
              <p className="m-0 mb-0.5">
                <span>Total ROI: </span>
                <span className={`font-bold ${data.totalRoi >= 0 ? 'text-success' : 'text-error'}`}>
                  {data.totalRoi >= 0 ? '+' : ''}
                  {data.totalRoi.toFixed(2)}%
                </span>
              </p>
              <p className="m-0">
                <span>Total trades: </span>
                <span className="font-bold">{data.tradesCount}</span>
              </p>
            </>
          ) : displayMode === 'winRate' ? (
            <>
              <p className="m-0 mb-0.5">
                <span>Win Rate: </span>
                <span className={`font-bold ${data.winRate >= 50 ? 'text-success' : 'text-error'}`}>
                  {data.winRate.toFixed(1)}%
                </span>
              </p>
              <p className="m-0">
                <span>Total trades: </span>
                <span className="font-bold">{data.tradesCount}</span>
              </p>
            </>
          ) : (
            <>
              <p className="m-0 mb-0.5">
                <span>Total ROI: </span>
                <span className={`font-bold ${data.totalRoi >= 0 ? 'text-success' : 'text-error'}`}>
                  {data.totalRoi >= 0 ? '+' : ''}
                  {data.totalRoi.toFixed(2)}%
                </span>
              </p>
              <p className="m-0">
                <span>Total trades: </span>
                <span className="font-bold">{data.tradesCount}</span>
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Настройка Y-axis в зависимости от режима отображения
  const yAxisDomain = (() => {
    if (displayMode === 'trades') {
      return [0, Math.max(...chartData.map((item) => item.tradesCount)) * 1.1];
    } else if (displayMode === 'winRate') {
      return [0, 100];
    } else {
      const roiValues = chartData.map((item) =>
        displayMode === 'averageRoi' ? item.avgRoi : item.totalRoi,
      );
      const minRoi = Math.min(...roiValues);
      const maxRoi = Math.max(...roiValues);
      const padding = Math.max(Math.abs(minRoi), Math.abs(maxRoi)) * 0.1;
      return [minRoi - padding, maxRoi + padding];
    }
  })();

  return (
    <div>
      <div className="flex justify-between items-center h-6 mb-4">
        <h3 className="font-semibold text-base-content">
          {displayMode === 'trades'
            ? 'Trades count'
            : displayMode === 'averageRoi'
              ? 'Average ROI'
              : displayMode === 'totalRoi'
                ? 'Total ROI'
                : 'Win Rate'}{' '}
          Of The Hour By {intervalMinutes}-Minute Intervals
        </h3>

        <select
          className="select select-bordered select-xs"
          value={displayMode}
          onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
        >
          <option value="trades">Trades Count</option>
          <option value="averageRoi">Average ROI</option>
          <option value="totalRoi">Total ROI</option>
          <option value="winRate">Win Rate</option>
        </select>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
            <XAxis
              dataKey="intervalLabel"
              tick={{ fontSize: 10, fill: 'currentColor' }}
              axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'currentColor' }}
              axisLine={{ stroke: 'currentColor', opacity: 0.3 }}
              domain={yAxisDomain}
              tickFormatter={(value) => Math.round(value).toString()}
            />
            <Tooltip content={<CustomTooltip />} />
            {displayMode === 'trades' ? (
              <>
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
              </>
            ) : (
              <Bar
                dataKey={
                  displayMode === 'averageRoi'
                    ? 'avgRoi'
                    : displayMode === 'totalRoi'
                      ? 'totalRoi'
                      : 'winRate'
                }
                radius={[2, 2, 2, 2]}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => {
                  const value =
                    displayMode === 'averageRoi'
                      ? entry.avgRoi
                      : displayMode === 'totalRoi'
                        ? entry.totalRoi
                        : entry.winRate;
                  const isPositive = displayMode === 'winRate' ? value >= 50 : value >= 0;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        isPositive
                          ? 'var(--fallback-su,oklch(var(--su)))'
                          : 'var(--fallback-er,oklch(var(--er)))'
                      }
                    />
                  );
                })}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
