import cn from 'classnames';
import * as math from 'mathjs';

import { dayjs } from '../../../shared/utils/daytime';
import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';

type TStatValue = string | number;

type TStatItem = {
  title: string;
  value: TStatValue;
  description?: string;
  tooltip?: string;
  valueColor?: 'success' | 'error' | 'warning' | 'default';
  format?: 'percentage' | 'number' | 'hours' | 'minutes' | 'default';
};

type TStatSection = {
  title: string;
  items: TStatItem[];
  columns: number;
};

type TBasicMetrics = {
  totalTrades: number;
  profitableTrades: number;
  unprofitableTrades: number;
  totalProfit: number;
  avgProfit: number;
  winRate: number;
  maxProfit: number;
  maxLoss: number;
};

type TDetailedMetrics = {
  avgProfitableRoi: number;
  avgUnprofitableRoi: number;
  profitFactor: number;
  medianRoi: number;
};

type TRiskMetrics = {
  stdDevRoi: number;
  sharpeRatio: number;
  maxDrawdown: number;
  recoveryFactor: number;
  coefficientOfVariation: number;
};

type TTimeMetrics = {
  avgHoldingTime: number;
  medianHoldingTime: number;
  minHoldingTime: number;
  maxHoldingTime: number;
  avgProfitableHoldingTime: number;
  avgUnprofitableHoldingTime: number;
  tradesPerDay: number;
};

const calculateBasicMetrics = (trades: TCompleteTrade[]): TBasicMetrics => {
  const totalTrades = trades.length;
  const profitableTrades = trades.filter((trade) => trade.roi > 0).length;
  const unprofitableTrades = totalTrades - profitableTrades;
  const rois = trades.map((trade) => trade.roi);
  const totalProfit = rois.length > 0 ? Number(math.sum(rois)) : 0;
  const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
  const maxProfit = rois.length > 0 ? Number(math.max(rois)) : 0;
  const maxLoss = rois.length > 0 ? Number(math.min(rois)) : 0;

  return {
    totalTrades,
    profitableTrades,
    unprofitableTrades,
    totalProfit,
    avgProfit,
    winRate,
    maxProfit,
    maxLoss,
  };
};

const calculateDetailedMetrics = (trades: TCompleteTrade[]): TDetailedMetrics => {
  // Разделяем сделки на прибыльные и убыточные (исключаем нулевые для корректного расчета Profit Factor)
  const profitableRois = trades.filter((trade) => trade.roi > 0).map((trade) => trade.roi);
  const unprofitableRois = trades.filter((trade) => trade.roi < 0).map((trade) => trade.roi);

  const avgProfitableRoi = profitableRois.length > 0 ? Number(math.mean(profitableRois)) : 0;
  const avgUnprofitableRoi = unprofitableRois.length > 0 ? Number(math.mean(unprofitableRois)) : 0;

  // Рассчитываем Profit Factor как отношение суммы всех прибылей к сумме всех убытков
  const totalProfitValue = profitableRois.length > 0 ? Number(math.sum(profitableRois)) : 0;
  const totalLossValue =
    unprofitableRois.length > 0 ? Number(math.abs(math.sum(unprofitableRois))) : 0;

  // Profit Factor = Сумма всех прибылей / Сумма всех убытков
  // Если убытков нет, а прибыли есть = Infinity (идеальная стратегия)
  // Если ни прибылей, ни убытков нет = 0
  const profitFactor =
    totalLossValue > 0 ? totalProfitValue / totalLossValue : totalProfitValue > 0 ? Infinity : 0;

  const rois = trades.map((trade) => trade.roi);
  const medianRoi = rois.length > 0 ? Number(math.median(rois)) : 0;

  return {
    avgProfitableRoi,
    avgUnprofitableRoi,
    profitFactor,
    medianRoi,
  };
};

const calculateRiskMetrics = (
  trades: TCompleteTrade[],
  avgProfit: number,
  totalProfit: number,
): TRiskMetrics => {
  const totalTrades = trades.length;

  const rois = trades.map((trade) => trade.roi);
  const stdDevRoi = totalTrades > 0 ? Number(math.std(rois)) : 0;

  const sharpeRatio = stdDevRoi > 0 ? avgProfit / stdDevRoi : 0;

  // Коэффициент вариации (CV) = стандартное отклонение / среднее значение
  const coefficientOfVariation =
    avgProfit !== 0 ? Math.abs(stdDevRoi / avgProfit) : stdDevRoi > 0 ? Infinity : 0;

  let peak = 0;
  let maxDrawdown = 0;
  let cumulativeRoi = 0;

  for (const trade of trades) {
    cumulativeRoi += trade.roi;
    if (cumulativeRoi > peak) {
      peak = cumulativeRoi;
    }
    const drawdown = peak - cumulativeRoi;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const recoveryFactor =
    maxDrawdown > 0 ? totalProfit / maxDrawdown : totalProfit > 0 ? Infinity : 0;

  return {
    stdDevRoi,
    sharpeRatio,
    maxDrawdown,
    recoveryFactor,
    coefficientOfVariation,
  };
};

const calculateTimeMetrics = (trades: TCompleteTrade[]): TTimeMetrics => {
  const holdingTimes = trades.map(
    (trade) => (trade.closeTime - trade.openTime) / dayjs.duration(1, 'minute').asMilliseconds(),
  );
  const avgHoldingTime = holdingTimes.length > 0 ? Number(math.mean(holdingTimes)) : 0;
  const medianHoldingTime = holdingTimes.length > 0 ? Number(math.median(holdingTimes)) : 0;
  const minHoldingTime = holdingTimes.length > 0 ? Number(math.min(holdingTimes)) : 0;
  const maxHoldingTime = holdingTimes.length > 0 ? Number(math.max(holdingTimes)) : 0;

  const profitableHoldingTimes = trades
    .filter((trade) => trade.roi > 0)
    .map(
      (trade) => (trade.closeTime - trade.openTime) / dayjs.duration(1, 'minute').asMilliseconds(),
    );
  const unprofitableHoldingTimes = trades
    .filter((trade) => trade.roi <= 0)
    .map(
      (trade) => (trade.closeTime - trade.openTime) / dayjs.duration(1, 'minute').asMilliseconds(),
    );

  const avgProfitableHoldingTime =
    profitableHoldingTimes.length > 0 ? Number(math.mean(profitableHoldingTimes)) : 0;
  const avgUnprofitableHoldingTime =
    unprofitableHoldingTimes.length > 0 ? Number(math.mean(unprofitableHoldingTimes)) : 0;

  const sortedTrades = [...trades].sort((a, b) => a.openTime - b.openTime);
  const tradingPeriod =
    sortedTrades.length > 1
      ? (sortedTrades[sortedTrades.length - 1].closeTime - sortedTrades[0].openTime) /
        dayjs.duration(1, 'day').asMilliseconds()
      : 1;
  const tradesPerDay = tradingPeriod > 0 ? trades.length / tradingPeriod : 0;

  return {
    avgHoldingTime,
    medianHoldingTime,
    minHoldingTime,
    maxHoldingTime,
    avgProfitableHoldingTime,
    avgUnprofitableHoldingTime,
    tradesPerDay,
  };
};

// Функция для создания секций статистик
const createStatSections = (
  basicMetrics: TBasicMetrics,
  detailedMetrics: TDetailedMetrics,
  riskMetrics: TRiskMetrics,
  timeMetrics: TTimeMetrics,
): TStatSection[] => {
  return [
    {
      title: 'Main Metrics',
      columns: 5,
      items: [
        {
          title: 'Average ROI',
          value: basicMetrics.avgProfit,
          format: 'percentage',
          valueColor: basicMetrics.avgProfit >= 0 ? 'success' : 'error',
          tooltip:
            'Average profitability of a single trade. Takes into account both profitable and unprofitable trades.',
        },
        {
          title: 'Median ROI',
          value: detailedMetrics.medianRoi,
          format: 'percentage',
          valueColor: detailedMetrics.medianRoi >= 0 ? 'success' : 'error',
          tooltip:
            'Median profitability trade. Unlike arithmetic mean, median is not distorted by extreme values.',
        },
        {
          title: 'Win Rate',
          value: basicMetrics.winRate,
          format: 'percentage',
          valueColor: basicMetrics.winRate >= 50 ? 'success' : 'error',
          description: `${basicMetrics.profitableTrades} / ${basicMetrics.totalTrades}`,
          tooltip:
            'Share of profitable trades from total. High percentage does not always mean strategy profitability.',
        },
        {
          title: 'Profit Factor',
          value: detailedMetrics.profitFactor === Infinity ? '∞' : detailedMetrics.profitFactor,
          format: 'default',
          valueColor:
            detailedMetrics.profitFactor >= 1.5
              ? 'success'
              : detailedMetrics.profitFactor >= 1
                ? 'warning'
                : 'error',
          description: `${basicMetrics.profitableTrades} / ${basicMetrics.unprofitableTrades}`,
          tooltip:
            'Ratio of sum of profitable trades to sum of unprofitable ones. >1.5 excellent, 1-1.5 good, <1 losing strategy.',
        },
        {
          title: 'Total Profit',
          value: basicMetrics.totalProfit,
          format: 'percentage',
          valueColor: basicMetrics.totalProfit >= 0 ? 'success' : 'error',
          tooltip: 'Total profitability of all trades. Shows overall strategy result.',
        },
        {
          title: 'Average Profitable Trade',
          value: detailedMetrics.avgProfitableRoi,
          format: 'percentage',
          description: `from ${basicMetrics.profitableTrades} trades`,
          tooltip:
            'Average profitability only among profitable trades. Shows strength of positive strategy signals.',
        },
        {
          title: 'Average Unprofitable Trade',
          value: detailedMetrics.avgUnprofitableRoi,
          format: 'percentage',
          description: `from ${basicMetrics.unprofitableTrades} trades`,
          tooltip:
            'Average loss only among unprofitable trades. Shows loss size for unsuccessful signals.',
        },
        {
          title: 'Max Profit',
          value: basicMetrics.maxProfit,
          format: 'percentage',
          tooltip:
            'Highest profit from a single trade. Shows strategy potential in best case scenario.',
        },
        {
          title: 'Max Loss',
          value: basicMetrics.maxLoss,
          format: 'percentage',
          tooltip: 'Highest loss from a single trade. Shows maximum risk per position.',
        },
        {
          title: 'Total Trades',
          value: basicMetrics.totalTrades,
          format: 'number',
          tooltip: 'Total number of trades completed during testing period.',
        },
      ],
    },
    {
      title: 'Risk Analysis',
      columns: 4,
      items: [
        {
          title: 'Max Drawdown',
          value: riskMetrics.maxDrawdown,
          format: 'percentage',
          valueColor:
            riskMetrics.maxDrawdown <= 5
              ? 'success'
              : riskMetrics.maxDrawdown <= 15
                ? 'warning'
                : 'error',
          tooltip:
            'Maximum capital decline from peak to trough. Shows worst loss scenario. <5% excellent, 5-15% acceptable, >15% risky.',
        },
        {
          title: 'Sharpe Ratio',
          value: riskMetrics.sharpeRatio,
          format: 'default',
          valueColor:
            riskMetrics.sharpeRatio >= 1
              ? 'success'
              : riskMetrics.sharpeRatio >= 0.5
                ? 'warning'
                : 'error',
          tooltip:
            'Ratio of profitability to volatility. >1 excellent, 0.5-1 good, <0.5 poor. Shows risk-adjusted efficiency.',
        },
        {
          title: 'Coefficient of Variation',
          value:
            riskMetrics.coefficientOfVariation === Infinity
              ? '∞'
              : riskMetrics.coefficientOfVariation,
          format: 'default',
          description: `σ=${riskMetrics.stdDevRoi.toFixed(4)}%`,
          valueColor:
            riskMetrics.coefficientOfVariation === Infinity ||
            riskMetrics.coefficientOfVariation <= 3
              ? 'success'
              : riskMetrics.coefficientOfVariation <= 8
                ? 'warning'
                : 'error',
          tooltip:
            'Coefficient of Variation (CV = σ/μ). Measures relative risk-adjusted consistency. ≤3 excellent, 3-8 acceptable, >8 high risk.',
        },
        {
          title: 'Recovery Factor',
          value: riskMetrics.recoveryFactor === Infinity ? '∞' : riskMetrics.recoveryFactor,
          format: 'default',
          valueColor:
            riskMetrics.recoveryFactor === Infinity || riskMetrics.recoveryFactor >= 3
              ? 'success'
              : riskMetrics.recoveryFactor >= 1.5
                ? 'warning'
                : 'error',
          tooltip:
            'Ratio of total profit to maximum drawdown. Measures recovery ability after losses. >3 excellent, 1.5-3 acceptable, <1.5 poor.',
        },
      ],
    },
    {
      title: 'Time Analysis',
      columns: 7,
      items: [
        {
          title: 'Average Holding Time',
          value: timeMetrics.avgHoldingTime,
          format: 'minutes',
          tooltip:
            'Average time between position opening and closing. Affects capital turnover and risk exposure.',
        },
        {
          title: 'Median Holding Time',
          value: timeMetrics.medianHoldingTime,
          format: 'minutes',
          tooltip:
            'Median time between position opening and closing. Affects capital turnover and risk exposure.',
        },
        {
          title: 'Min Holding Time',
          value: timeMetrics.minHoldingTime,
          format: 'minutes',
          tooltip: 'Minimum position holding time. Shows fastest trade.',
        },
        {
          title: 'Max Holding Time',
          value: timeMetrics.maxHoldingTime,
          format: 'minutes',
          tooltip: 'Maximum position holding time. Shows longest trade.',
        },
        {
          title: 'Average Time Profitable',
          value: timeMetrics.avgProfitableHoldingTime,
          format: 'minutes',
          description: `from ${basicMetrics.profitableTrades} trades`,
          tooltip: 'Average holding time for profitable positions only.',
        },
        {
          title: 'Average Time Unprofitable',
          value: timeMetrics.avgUnprofitableHoldingTime,
          format: 'minutes',
          description: `from ${basicMetrics.unprofitableTrades} trades`,
          tooltip: 'Average holding time for unprofitable positions only.',
        },
        {
          title: 'Trading Frequency',
          value: timeMetrics.tradesPerDay,
          format: 'default',
          description: 'trades per day',
          tooltip: 'Average number of trades per day. Shows strategy activity.',
        },
      ],
    },
  ];
};

const StatCard = ({ item }: { item: TStatItem }) => {
  const formatValue = (value: TStatValue, format?: string): string => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'percentage':
        return `${value.toFixed(4)}%`;
      case 'hours':
        return `${value.toFixed(1)}h`;
      case 'minutes':
        return `${value.toFixed(2)}m`;
      case 'number':
        return value.toString();
      case 'trades_per_day':
        return `${value.toFixed(2)}`;
      default:
        return value.toFixed(4);
    }
  };

  const getValueColor = (color?: string): string => {
    switch (color) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      default:
        return '';
    }
  };

  return (
    <div className="stat bg-base-300 rounded-md p-2">
      <div className="stat-title text-xs font-medium flex items-center gap-1">
        {item.title}
        {item.tooltip && (
          <div className="tooltip tooltip-top" data-tip={item.tooltip}>
            <span className="text-xs cursor-help">ℹ️</span>
          </div>
        )}
      </div>
      <div className={cn('stat-value text-base font-bold', getValueColor(item.valueColor))}>
        {formatValue(item.value, item.format)}
      </div>
      {item.description && <div className="stat-desc text-xs">{item.description}</div>}
    </div>
  );
};

const StatGrid = ({ items, columns }: { items: TStatItem[]; columns: number }) => {
  return (
    <div
      className={cn('grid gap-2', {
        'grid-cols-4': columns === 4,
        'grid-cols-5': columns === 5,
        'grid-cols-6': columns === 6,
        'grid-cols-7': columns === 7,
      })}
    >
      {items.map((item, index) => (
        <StatCard key={index} item={item} />
      ))}
    </div>
  );
};

const StatSection = ({ section }: { section: TStatSection }) => (
  <div>
    <h3 className="text-sm font-semibold mb-2 text-base-content">{section.title}</h3>
    <StatGrid items={section.items} columns={section.columns} />
  </div>
);

export const BacktestMetrics = ({ trades }: { trades: TCompleteTrade[] }) => {
  const basicMetrics = calculateBasicMetrics(trades);
  const detailedMetrics = calculateDetailedMetrics(trades);
  const riskMetrics = calculateRiskMetrics(
    trades,
    basicMetrics.avgProfit,
    basicMetrics.totalProfit,
  );
  const timeMetrics = calculateTimeMetrics(trades);
  const sections = createStatSections(basicMetrics, detailedMetrics, riskMetrics, timeMetrics);

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <StatSection key={index} section={section} />
      ))}
    </div>
  );
};
