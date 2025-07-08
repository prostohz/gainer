import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';
import { BacktestMetrics } from './BacktestMetrics';
import { BacktestCloseReasons } from './BacktestCloseReasons';
import { BacktestAssets } from './BacktestAssets';
import { BacktestTradesByRoiHistogram } from './BacktestTradesByRoiHistogram';
import { BacktestTradesByRoiCumHistogram } from './BacktestTradesByRoiCumHistogram';
import { BacktestTradesByHoldingTimeHistogram } from './BacktestTradesByHoldingTimeHistogram';
import { BacktestTradesByPairScore } from './BacktestTradesByPairScore';

export const BacktestStats = ({ trades }: { trades: TCompleteTrade[] }) => {
  return (
    <div className="space-y-6">
      <BacktestMetrics trades={trades} />
      <BacktestCloseReasons trades={trades} />

      <div className="grid grid-cols-2 gap-4 space-4">
        <BacktestTradesByRoiHistogram trades={trades} />
        <BacktestTradesByRoiCumHistogram trades={trades} />
        <BacktestTradesByHoldingTimeHistogram trades={trades} />
        <BacktestTradesByPairScore />
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
