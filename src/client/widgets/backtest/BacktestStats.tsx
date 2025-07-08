import { TCompleteTrade } from '../../../server/trading/strategies/MRStrategy/backtest';
import { BacktestMetrics } from './BacktestMetrics';
import { BacktestCloseReasons } from './BacktestCloseReasons';
import { BacktestAssets } from './BacktestAssets';
import { BacktestTradesByRoiHistogram } from './BacktestTradesByRoiHistogram';
import { BacktestTradesByRoiCumHistogram } from './BacktestTradesByRoiCumHistogram';
import { BacktestTradesByHoldingTimeHistogram } from './BacktestTradesByHoldingTimeHistogram';
import { BacktestTradesByPairScore } from './BacktestTradesByPairScore';
import { BacktestTradesByDateTimeHistogram } from './BacktestTradesByDateTimeHistogram';
import { BacktestTradesByHourTimeHistogram } from './BacktestTradesByHourTimeHistogram';

export const BacktestStats = ({
  trades,
  reportId,
  tagId,
}: {
  trades: TCompleteTrade[];
  reportId?: number;
  tagId: number | null;
}) => {
  return (
    <div className="space-y-4">
      <BacktestMetrics trades={trades} />
      <BacktestCloseReasons trades={trades} />

      <div className="grid grid-cols-2 gap-4">
        <BacktestTradesByRoiHistogram trades={trades} />
        <BacktestTradesByRoiCumHistogram trades={trades} />
        <BacktestTradesByHoldingTimeHistogram trades={trades} />
        <BacktestTradesByPairScore reportId={reportId} tagId={tagId} />
        <BacktestTradesByDateTimeHistogram trades={trades} />
        <BacktestTradesByHourTimeHistogram trades={trades} />
      </div>

      <BacktestAssets trades={trades} />
    </div>
  );
};
