import * as math from 'mathjs';
import { useState } from 'react';
import { FixedSizeList } from 'react-window';

import { TCompleteTrade } from '../../server/trading/strategies/MRStrategy/backtest';

type TSortField =
  | 'pair'
  | 'avgRoi'
  | 'effectiveness'
  | 'winRate'
  | 'totalTrades'
  | 'profitableTrades'
  | 'unprofitableTrades'
  | 'maxProfit'
  | 'maxLoss';

type TSortDirection = 'asc' | 'desc';

type TSortConfig = {
  field: TSortField;
  direction: TSortDirection;
};

type TPairStats = {
  pair: string;
  symbolA: string;
  symbolB: string;
  totalTrades: number;
  profitableTrades: number;
  unprofitableTrades: number;
  totalProfit: number;
  avgRoi: number;
  effectiveness: number;
  winRate: number;
  maxProfit: number;
  maxLoss: number;
};

type TColumnConfig = {
  field: TSortField;
  label: string;
  width: string;
  render: (stats: TPairStats) => React.ReactNode;
};

const COLUMNS: TColumnConfig[] = [
  {
    field: 'pair',
    label: 'Trading Pair',
    width: '2fr',
    render: (stats) => (
      <span className="text-sm text-base-content">
        {stats.symbolA}/{stats.symbolB}
      </span>
    ),
  },
  {
    field: 'avgRoi',
    label: 'Average ROI',
    width: '1fr',
    render: (stats) => (
      <span className={`font-medium ${stats.avgRoi >= 0 ? 'text-success' : 'text-error'}`}>
        {stats.avgRoi.toFixed(4)}%
      </span>
    ),
  },
  {
    field: 'effectiveness',
    label: 'Effectiveness',
    width: '1fr',
    render: (stats) => (
      <span className={`font-medium ${stats.effectiveness >= 0 ? 'text-success' : 'text-error'}`}>
        {stats.effectiveness.toFixed(3)}
      </span>
    ),
  },
  {
    field: 'winRate',
    label: 'Win Rate',
    width: '1fr',
    render: (stats) => (
      <span className={`font-medium ${stats.winRate >= 50 ? 'text-success' : 'text-error'}`}>
        {stats.winRate.toFixed(1)}%
      </span>
    ),
  },
  {
    field: 'totalTrades',
    label: 'Total Trades',
    width: '1fr',
    render: (stats) => <span className="text-base-content">{stats.totalTrades}</span>,
  },
  {
    field: 'profitableTrades',
    label: 'Profitable',
    width: '1fr',
    render: (stats) => <span className="text-base-content">{stats.profitableTrades}</span>,
  },
  {
    field: 'unprofitableTrades',
    label: 'Unprofitable',
    width: '1fr',
    render: (stats) => <span className="text-base-content">{stats.unprofitableTrades}</span>,
  },
  {
    field: 'maxProfit',
    label: 'Max Profit',
    width: '1fr',
    render: (stats) => (
      <span className={`font-medium ${stats.maxProfit > 0 ? 'text-success' : 'text-neutral'}`}>
        {stats.maxProfit > 0 ? `${stats.maxProfit.toFixed(4)}%` : '–'}
      </span>
    ),
  },
  {
    field: 'maxLoss',
    label: 'Max Loss',
    width: '1fr',
    render: (stats) => (
      <span className={`font-medium ${stats.maxLoss < 0 ? 'text-error' : 'text-neutral'}`}>
        {stats.maxLoss < 0 ? `${stats.maxLoss.toFixed(4)}%` : '–'}
      </span>
    ),
  },
];

const calculatePairStats = (results: TCompleteTrade[]): TPairStats[] => {
  const pairGroups = results.reduce(
    (groups, trade) => {
      const pairKey = `${trade.symbolA}-${trade.symbolB}`;
      if (!groups[pairKey]) {
        groups[pairKey] = [];
      }
      groups[pairKey].push(trade);
      return groups;
    },
    {} as Record<string, TCompleteTrade[]>,
  );

  return Object.entries(pairGroups).map(([pairKey, pairTrades]) => {
    const [symbolA, symbolB] = pairKey.split('-');

    const totalTrades = pairTrades.length;
    const profitableTrades = pairTrades.filter((trade) => trade.roi > 0).length;
    const unprofitableTrades = totalTrades - profitableTrades;

    const rois = pairTrades.map((trade) => trade.roi);
    const totalProfit = rois.length > 0 ? Number(math.sum(rois)) : 0;
    const avgRoi = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const effectiveness =
      results.length > 0 ? ((profitableTrades - unprofitableTrades) / results.length) * 1000 : 0;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

    const maxProfit = rois.length > 0 ? Number(math.max(rois)) : 0;
    const maxLoss = rois.length > 0 ? Number(math.min(rois)) : 0;

    return {
      pair: pairKey,
      symbolA,
      symbolB,
      totalTrades,
      profitableTrades,
      unprofitableTrades,
      totalProfit,
      avgRoi,
      effectiveness,
      winRate,
      maxProfit,
      maxLoss,
    };
  });
};

const sortPairStats = (stats: TPairStats[], sortConfig: TSortConfig): TPairStats[] => {
  return [...stats].sort((a, b) => {
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const result = aValue.localeCompare(bValue);
      return sortConfig.direction === 'asc' ? result : -result;
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const result = aValue - bValue;
      return sortConfig.direction === 'asc' ? result : -result;
    }

    return 0;
  });
};

const TableHeader = ({
  sortConfig,
  onSort,
}: {
  sortConfig: TSortConfig;
  onSort: (field: TSortField) => void;
}) => {
  const getSortIcon = (field: TSortField) => {
    if (sortConfig.field !== field) {
      return null;
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const gridCols = `grid-cols-[${COLUMNS.map((col) => col.width).join('_')}]`;
  const headerButtonClass =
    'text-left hover:bg-base-300/50 p-1 rounded cursor-pointer transition-colors';

  return (
    <div
      className={`grid ${gridCols} gap-3 p-3 border-b border-base-300 text-sm font-medium tracking-wider`}
    >
      {COLUMNS.map((column) => (
        <button
          key={column.field}
          className={headerButtonClass}
          onClick={() => onSort(column.field)}
        >
          {column.label} {getSortIcon(column.field)}
        </button>
      ))}
    </div>
  );
};

const TableRow = ({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: TPairStats[];
}) => {
  const stats = data[index];
  const gridCols = `grid-cols-[${COLUMNS.map((col) => col.width).join('_')}]`;

  return (
    <div
      style={style}
      className={`grid ${gridCols} gap-3 p-3 text-sm hover:bg-base-200 border-b border-base-300/50`}
    >
      {COLUMNS.map((column) => (
        <div key={column.field} className="text-left">
          {column.render(stats)}
        </div>
      ))}
    </div>
  );
};

export const BacktestPairs = ({ results }: { results: TCompleteTrade[] }) => {
  const [sortConfig, setSortConfig] = useState<TSortConfig>({
    field: 'avgRoi',
    direction: 'desc',
  });

  const handleSort = (field: TSortField) => {
    setSortConfig((prevConfig) => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const rawPairStats = calculatePairStats(results);
  const pairStats = sortPairStats(rawPairStats, sortConfig);

  if (pairStats.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-base-content/60">No data available for pair statistics</div>
      </div>
    );
  }

  const ROW_HEIGHT = 46;
  const MAX_TABLE_HEIGHT = Math.min(pairStats.length * ROW_HEIGHT, 10 * ROW_HEIGHT);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-base-300 overflow-hidden">
        <TableHeader sortConfig={sortConfig} onSort={handleSort} />

        <FixedSizeList
          height={MAX_TABLE_HEIGHT}
          itemCount={pairStats.length}
          itemSize={ROW_HEIGHT}
          itemData={pairStats}
          width="100%"
        >
          {TableRow}
        </FixedSizeList>
      </div>
    </div>
  );
};
