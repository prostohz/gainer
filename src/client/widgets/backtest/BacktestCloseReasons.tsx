import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';

type TCloseReasonStats = {
  reason: string;
  count: number;
  percentage: number;
  avgRoi: number;
  totalRoi: number;
  winRate: number;
};

const calculateCloseReasonStats = (trades: TCompleteTrade[]): TCloseReasonStats[] => {
  const totalTrades = trades.length;

  const closeReasonStats = trades.reduce(
    (stats, trade) => {
      const reason = trade.closeReason;
      let category = 'Other';

      if (reason.includes('Stop-loss triggered by price loss')) {
        category = 'Stop-loss by price';
      } else if (reason.includes('Stop-loss triggered at Z-score')) {
        category = 'Stop-loss by Z-score';
      } else if (reason.includes('Z-score mean reversion')) {
        category = 'Mean reversion';
      }

      if (!stats[category]) {
        stats[category] = { count: 0, totalRoi: 0, trades: [] };
      }

      stats[category].count++;
      stats[category].totalRoi += trade.roi;
      stats[category].trades.push(trade);

      return stats;
    },
    {} as Record<string, { count: number; totalRoi: number; trades: TCompleteTrade[] }>,
  );

  return Object.entries(closeReasonStats)
    .map(([reason, data]) => ({
      reason,
      count: data.count,
      percentage: totalTrades > 0 ? (data.count / totalTrades) * 100 : 0,
      avgRoi: data.count > 0 ? data.totalRoi / data.count : 0,
      totalRoi: data.totalRoi,
      winRate:
        data.count > 0 ? (data.trades.filter((t) => t.roi > 0).length / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
};

export const BacktestCloseReasons = ({ trades }: { trades: TCompleteTrade[] }) => {
  const stats = calculateCloseReasonStats(trades);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 text-base-content">Position Close Reasons</h3>
      <div className="bg-base-300 rounded-md border border-base-300 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-base-100">
            <tr>
              <th className="text-left p-3 font-medium text-base-content">Reason</th>
              <th className="text-left p-3 font-medium text-base-content">Frequency</th>
              <th className="text-left p-3 font-medium text-base-content">Average Profit</th>
              <th className="text-left p-3 font-medium text-base-content">Win Rate</th>
              <th className="text-left p-3 font-medium text-base-content">Total Profit</th>
              <th className="text-left p-3 font-medium text-base-content">Count</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((entry) => (
              <tr key={entry.reason}>
                <td className="p-3 font-medium text-base-content">{entry.reason}</td>
                <td className="p-3 text-left">{entry.percentage.toFixed(2)}%</td>
                <td
                  className={`p-3 text-left font-medium ${entry.avgRoi >= 0 ? 'text-success' : 'text-error'}`}
                >
                  {entry.avgRoi.toFixed(4)}%
                </td>
                <td
                  className={`p-3 text-left ${entry.winRate >= 50 ? 'text-success' : 'text-error'}`}
                >
                  {entry.winRate.toFixed(4)}%
                </td>
                <td
                  className={`p-3 text-left font-medium ${entry.totalRoi >= 0 ? 'text-success' : 'text-error'}`}
                >
                  {entry.totalRoi.toFixed(4)}%
                </td>

                <td className="p-3 text-left">{entry.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
