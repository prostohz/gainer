import * as math from 'mathjs';
import { useState } from 'react';
import { FixedSizeList } from 'react-window';

import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';

type TViewMode = 'pairs' | 'assets';

type TSortField =
  | 'pair'
  | 'avgRoi'
  | 'effectiveness'
  | 'winRate'
  | 'totalTrades'
  | 'profitableTrades'
  | 'unprofitableTrades'
  | 'maxProfit'
  | 'maxLoss'
  | 'totalProfit';

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

type TAssetStats = {
  pair: string; // used for sorting compatibility
  symbol: string;
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

type TStats = TPairStats | TAssetStats;

type TColumnConfig = {
  field: TSortField;
  label: string;
  renderPair: (stats: TPairStats) => React.ReactNode;
  renderAsset: (stats: TAssetStats) => React.ReactNode;
};

const COLUMNS: TColumnConfig[] = [
  {
    field: 'pair',
    label: 'Trading Pair / Asset',
    renderPair: (stats) => (
      <span className="text-sm text-base-content">
        {stats.symbolA}/{stats.symbolB}
      </span>
    ),
    renderAsset: (stats) => (
      <span className="text-sm text-base-content font-medium">{stats.symbol}</span>
    ),
  },
  {
    field: 'avgRoi',
    label: 'Avg ROI',
    renderPair: (stats) => (
      <span className={`font-medium ${stats.avgRoi >= 0 ? 'text-success' : 'text-error'}`}>
        {stats.avgRoi.toFixed(4)}%
      </span>
    ),
    renderAsset: (stats) => (
      <span className={`font-medium ${stats.avgRoi >= 0 ? 'text-success' : 'text-error'}`}>
        {stats.avgRoi.toFixed(4)}%
      </span>
    ),
  },
  {
    field: 'effectiveness',
    label: 'Effectiveness',
    renderPair: (stats) => (
      <span className={`font-medium ${stats.effectiveness >= 0 ? 'text-success' : 'text-error'}`}>
        {stats.effectiveness.toFixed(3)}
      </span>
    ),
    renderAsset: (stats) => (
      <span className={`font-medium ${stats.effectiveness >= 0 ? 'text-success' : 'text-error'}`}>
        {stats.effectiveness.toFixed(3)}
      </span>
    ),
  },
  {
    field: 'winRate',
    label: 'Win Rate',
    renderPair: (stats) => (
      <span className={`font-medium ${stats.winRate >= 50 ? 'text-success' : 'text-error'}`}>
        {stats.winRate.toFixed(1)}%
      </span>
    ),
    renderAsset: (stats) => (
      <span className={`font-medium ${stats.winRate >= 50 ? 'text-success' : 'text-error'}`}>
        {stats.winRate.toFixed(1)}%
      </span>
    ),
  },
  {
    field: 'totalTrades',
    label: 'Trades',
    renderPair: (stats) => <span className="text-base-content">{stats.totalTrades}</span>,
    renderAsset: (stats) => <span className="text-base-content">{stats.totalTrades}</span>,
  },
  {
    field: 'profitableTrades',
    label: 'Profitable',
    renderPair: (stats) => <span className="text-base-content">{stats.profitableTrades}</span>,
    renderAsset: (stats) => <span className="text-base-content">{stats.profitableTrades}</span>,
  },
  {
    field: 'unprofitableTrades',
    label: 'Unprofitable',
    renderPair: (stats) => <span className="text-base-content">{stats.unprofitableTrades}</span>,
    renderAsset: (stats) => <span className="text-base-content">{stats.unprofitableTrades}</span>,
  },
  {
    field: 'maxProfit',
    label: 'Max Profit',
    renderPair: (stats) => (
      <span className={`font-medium ${stats.maxProfit > 0 ? 'text-success' : 'text-neutral'}`}>
        {stats.maxProfit > 0 ? `${stats.maxProfit.toFixed(4)}%` : '–'}
      </span>
    ),
    renderAsset: (stats) => (
      <span className={`font-medium ${stats.maxProfit > 0 ? 'text-success' : 'text-neutral'}`}>
        {stats.maxProfit > 0 ? `${stats.maxProfit.toFixed(4)}%` : '–'}
      </span>
    ),
  },
  {
    field: 'maxLoss',
    label: 'Max Loss',
    renderPair: (stats) => (
      <span className={`font-medium ${stats.maxLoss < 0 ? 'text-error' : 'text-neutral'}`}>
        {stats.maxLoss < 0 ? `${stats.maxLoss.toFixed(4)}%` : '–'}
      </span>
    ),
    renderAsset: (stats) => (
      <span className={`font-medium ${stats.maxLoss < 0 ? 'text-error' : 'text-neutral'}`}>
        {stats.maxLoss < 0 ? `${stats.maxLoss.toFixed(4)}%` : '–'}
      </span>
    ),
  },
  {
    field: 'totalProfit',
    label: 'Total Profit',
    renderPair: (stats) => (
      <span className={`font-medium ${stats.totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
        {stats.totalProfit.toFixed(4)}%
      </span>
    ),
    renderAsset: (stats) => (
      <span className={`font-medium ${stats.totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
        {stats.totalProfit.toFixed(4)}%
      </span>
    ),
  },
];

const calculatePairStats = (trades: TCompleteTrade[]): TPairStats[] => {
  const pairGroups = trades.reduce(
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
      trades.length > 0 ? ((profitableTrades - unprofitableTrades) / trades.length) * 1000 : 0;
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

const calculateAssetStats = (trades: TCompleteTrade[]): TAssetStats[] => {
  const assetTrades: Array<{ symbol: string; trade: TCompleteTrade }> = [];

  trades.forEach((trade) => {
    assetTrades.push({ symbol: trade.symbolA, trade }, { symbol: trade.symbolB, trade });
  });

  // Group by symbols
  const assetGroups = assetTrades.reduce(
    (groups, { symbol, trade }) => {
      if (!groups[symbol]) {
        groups[symbol] = [];
      }
      groups[symbol].push({ trade });
      return groups;
    },
    {} as Record<string, Array<{ trade: TCompleteTrade }>>,
  );

  return Object.entries(assetGroups).map(([symbol, symbolTrades]) => {
    const totalTrades = symbolTrades.length;
    const profitableTrades = symbolTrades.filter(({ trade }) => trade.roi > 0).length;
    const unprofitableTrades = totalTrades - profitableTrades;

    const rois = symbolTrades.map(({ trade }) => trade.roi);
    const totalProfit = rois.length > 0 ? Number(math.sum(rois)) : 0;
    const avgRoi = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const effectiveness =
      trades.length > 0
        ? ((profitableTrades - unprofitableTrades) / (trades.length * 2)) * 1000
        : 0;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

    const maxProfit = rois.length > 0 ? Number(math.max(rois)) : 0;
    const maxLoss = rois.length > 0 ? Number(math.min(rois)) : 0;

    return {
      pair: symbol, // used for sorting compatibility
      symbol,
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

const sortStats = (stats: TStats[], sortConfig: TSortConfig): TStats[] => {
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

const ViewModeSelector = ({
  viewMode,
  onViewModeChange,
}: {
  viewMode: TViewMode;
  onViewModeChange: (mode: TViewMode) => void;
}) => {
  const viewModes = [
    { label: 'Assets', value: 'assets' },
    { label: 'Pairs', value: 'pairs' },
  ] as const;

  return (
    <div className="flex items-center justify-end space-x-4 p-4">
      <div className="flex bg-base-200 rounded-lg p-1">
        {viewModes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onViewModeChange(mode.value)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              viewMode === mode.value
                ? 'bg-neutral text-neutral-content'
                : 'text-base-content hover:bg-base-300'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
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

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 p-3 border-b border-base-300 text-sm font-medium tracking-wider">
      {COLUMNS.map((column) => (
        <button
          key={column.field}
          className="text-left hover:bg-base-300/50 rounded cursor-pointer transition-colors text-base-content/80"
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
  data: { stats: TStats[]; viewMode: TViewMode };
}) => {
  const stats = data.stats[index];
  const { viewMode } = data;

  return (
    <div
      style={style}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 p-3 text-sm hover:bg-base-200 border-b border-base-300/50"
    >
      {COLUMNS.map((column) => (
        <div key={column.field} className="text-left">
          {viewMode === 'pairs'
            ? column.renderPair(stats as TPairStats)
            : column.renderAsset(stats as TAssetStats)}
        </div>
      ))}
    </div>
  );
};

export const BacktestAssets = ({ trades }: { trades: TCompleteTrade[] }) => {
  const [viewMode, setViewMode] = useState<TViewMode>('assets');
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

  const rawStats = viewMode === 'pairs' ? calculatePairStats(trades) : calculateAssetStats(trades);
  const stats = sortStats(rawStats, sortConfig);

  if (stats.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-base-content/60">No data to display</div>
      </div>
    );
  }

  const ROW_HEIGHT = 46;
  const MAX_TABLE_HEIGHT = Math.min(stats.length * ROW_HEIGHT, 10 * ROW_HEIGHT);

  return (
    <div>
      <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />

      <div className="rounded-md border border-base-300 overflow-hidden">
        <TableHeader sortConfig={sortConfig} onSort={handleSort} />

        <FixedSizeList
          height={MAX_TABLE_HEIGHT}
          itemCount={stats.length}
          itemSize={ROW_HEIGHT}
          itemData={{ stats, viewMode }}
          width="100%"
        >
          {TableRow}
        </FixedSizeList>
      </div>
    </div>
  );
};
