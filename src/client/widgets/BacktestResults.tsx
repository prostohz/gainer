import cn from 'classnames';

import { TCompleteTrade } from '../../server/trading/strategies/MeanReversionStrategy/backtest';
import { dayjs } from '../../shared/utils/daytime';
import { useAssets } from '../entities/assets';

export const BacktestResults = ({ results }: { results: TCompleteTrade[] }) => {
  const { assetMap, isLoading } = useAssets();

  if (isLoading) {
    return null;
  }

  const totalTrades = results.length;
  const profitableTrades = results.filter((trade) => trade.roi > 0).length;
  const unprofitableTrades = totalTrades - profitableTrades;
  const totalProfit = results.reduce((sum, trade) => sum + trade.roi, 0);
  const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

  const maxProfit = Math.max(...results.map((trade) => trade.roi), 0);
  const maxLoss = Math.min(...results.map((trade) => trade.roi), 0);

  const renderContent = () => {
    if (results.length === 0) {
      return <div className="text-base-content text-center p-4">No trades</div>;
    }

    return (
      <div className="bg-base-300 rounded-lg p-4">
        <h4 className="text-md font-semibold mb-3">Trade history</h4>
        <div className="max-h-96 overflow-auto w-full">
          <div className="overflow-x-scroll w-full">
            <div className="w-max">
              <div className="grid grid-cols-[1fr_repeat(13,150px)] gap-2 mb-2 font-semibold text-xs">
                <div className="px-2">ID</div>
                <div>Symbol A</div>
                <div>Symbol B</div>
                <div>Open time</div>
                <div>Close time</div>
                <div>Duration</div>
                <div>Direction</div>
                <div>Price A (open/close)</div>
                <div>Price B (open/close)</div>
                <div>Quantity A</div>
                <div>Quantity B</div>
                <div>Profit %</div>
                <div>Open reason</div>
                <div>Close reason</div>
              </div>

              {results.map((trade, index) => {
                const assetA = assetMap[trade.symbolA];
                const assetB = assetMap[trade.symbolB];

                const assetAPricePrecision = assetA.pricePrecision;
                const assetBPricePrecision = assetB.pricePrecision;

                return (
                  <div
                    key={index}
                    className={cn(
                      'grid grid-cols-[1fr_repeat(13,150px)] gap-2 py-1 text-xs items-center',
                      {
                        'bg-success/10': trade.roi >= 0,
                        'bg-error/10': trade.roi < 0,
                      },
                    )}
                  >
                    <div className="px-2">{trade.id}</div>
                    <div>{trade.symbolA}</div>
                    <div>{trade.symbolB}</div>
                    <div>{dayjs(trade.openTime).format('DD.MM HH:mm:ss')}</div>
                    <div>{dayjs(trade.closeTime).format('DD.MM HH:mm:ss')}</div>
                    <div>{dayjs(trade.closeTime).diff(dayjs(trade.openTime), 'minutes')}m</div>
                    <div>
                      <span className="badge badge-sm badge-info">
                        {trade.direction === 'buy-sell' ? 'BUY/SELL' : 'SELL/BUY'}
                      </span>
                    </div>
                    <div>
                      {trade.openPriceA.toFixed(assetAPricePrecision)} /{' '}
                      {trade.closePriceA.toFixed(assetAPricePrecision)}
                    </div>
                    <div>
                      {trade.openPriceB.toFixed(assetBPricePrecision)} /{' '}
                      {trade.closePriceB.toFixed(assetBPricePrecision)}
                    </div>
                    <div>{trade.quantityA.toFixed(assetA.volumePrecision)}</div>
                    <div>{trade.quantityB.toFixed(assetB.volumePrecision)}</div>
                    <div
                      className={cn('font-semibold', {
                        'text-success': trade.roi >= 0,
                        'text-error': trade.roi < 0,
                      })}
                    >
                      {trade.roi.toFixed(2)}%
                    </div>
                    <div>{trade.openReason}</div>
                    <div>{trade.closeReason}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="bg-base-300 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold mb-3">Backtest results</h3>

        <div className="grid grid-cols-8 gap-4 mb-4">
          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Total trades</div>
            <div className="stat-value text-lg">{totalTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Profitable</div>
            <div className="stat-value text-lg text-success">{profitableTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Unprofitable</div>
            <div className="stat-value text-lg text-error">{unprofitableTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Win rate</div>
            <div className="stat-value text-lg">{winRate.toFixed(1)}%</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Total profit</div>
            <div
              className={cn('stat-value text-lg', {
                'text-success': totalProfit >= 0,
                'text-error': totalProfit < 0,
              })}
            >
              {totalProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Average profit</div>
            <div
              className={cn('stat-value text-lg', {
                'text-success': avgProfit >= 0,
                'text-error': avgProfit < 0,
              })}
            >
              {avgProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Max profit</div>
            <div className="stat-value text-lg text-success">{maxProfit.toFixed(2)}%</div>
          </div>

          <div className="stat bg-base-100 rounded-lg p-3">
            <div className="stat-title text-xs">Max loss</div>
            <div className="stat-value text-lg text-error">{maxLoss.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};
