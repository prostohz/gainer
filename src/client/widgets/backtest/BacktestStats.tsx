import { TMRReport } from '../../../shared/types';
import { BacktestMetrics } from './BacktestMetrics';
import { BacktestCloseReasons } from './BacktestCloseReasons';
import { BacktestAssets } from './BacktestAssets';
import { BacktestTradesByRoiHistogram } from './BacktestTradesByRoiHistogram';
import { BacktestTradesByRoiCumHistogram } from './BacktestTradesByRoiCumHistogram';
import { BacktestTradesByHoldingTimeHistogram } from './BacktestTradesByHoldingTimeHistogram';
import { BacktestTradesByPairScore } from './BacktestTradesByPairScore';

export const BacktestStats = ({ reports }: { reports: TMRReport[] }) => {
  const trades = reports.flatMap((report) => report.backtest || []);

  return (
    <div className="space-y-6">
      <BacktestMetrics trades={trades} />
      <BacktestCloseReasons trades={trades} />

      <div className="flex gap-4">
        <div className="w-1/2">
          <h3 className="text-sm font-semibold mb-2 text-base-content">Trades By ROI</h3>
          <BacktestTradesByRoiHistogram trades={trades} />
        </div>
        <div className="w-1/2">
          <h3 className="text-sm font-semibold mb-2 text-base-content">Trades By ROI Cumulative</h3>
          <BacktestTradesByRoiCumHistogram trades={trades} />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-1/2">
          <h3 className="text-sm font-semibold mb-2 text-base-content">Trades By Holding Time</h3>
          <BacktestTradesByHoldingTimeHistogram trades={trades} />
        </div>
        <div className="w-1/2">
          <h3 className="text-sm font-semibold mb-2 text-base-content">Trades By Pair Score</h3>
          <BacktestTradesByPairScore reports={reports} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-base-content">Asset Stats</h3>
        <div className="bg-base-300 rounded-md">
          <BacktestAssets trades={trades} />
        </div>
      </div>
    </div>
  );
};
