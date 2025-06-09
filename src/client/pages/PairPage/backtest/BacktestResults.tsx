import cn from 'classnames';
import dayjs from 'dayjs';

import { useAssets } from '../../../entities/assets';
import { TBacktestTrade } from './types';

export const BacktestResults = ({ results }: { results: TBacktestTrade[] }) => {
  const { assetMap } = useAssets();

  const totalTrades = results.length;
  const profitableTrades = results.filter((trade) => trade.profitPercent > 0).length;
  const unprofitableTrades = totalTrades - profitableTrades;
  const totalProfit = results.reduce((sum, trade) => sum + trade.profitPercent, 0);
  const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

  const maxProfit = Math.max(...results.map((trade) => trade.profitPercent), 0);
  const maxLoss = Math.min(...results.map((trade) => trade.profitPercent), 0);

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-base-300 rounded-lg p-4">
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
            <div className="stat-value text-lg text-success">{unprofitableTrades}</div>
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

      {totalTrades > 0 && (
        <div className="bg-base-300 rounded-lg p-4">
          <h4 className="text-md font-semibold mb-3">Trade history</h4>
          <div className="overflow-x-auto max-h-96">
            <table className="table table-sm w-full overflow-x-auto">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Symbol A</th>
                  <th>Symbol B</th>
                  <th>Open time</th>
                  <th>Close time</th>
                  <th>Duration</th>
                  <th>Direction</th>
                  <th>Price A (open/close)</th>
                  <th>Price B (open/close)</th>
                  <th>Profit %</th>
                  <th>Open reason</th>
                  <th>Close reason</th>
                </tr>
              </thead>
              <tbody>
                {results.map((trade, index) => {
                  const assetA = assetMap[trade.symbolA];
                  const assetB = assetMap[trade.symbolB];

                  const assetAPricePrecision = assetA.pricePrecision;
                  const assetBPricePrecision = assetB.pricePrecision;

                  return (
                    <tr
                      key={index}
                      className={cn({
                        'bg-success/10': trade.profitPercent >= 0,
                        'bg-error/10': trade.profitPercent < 0,
                      })}
                    >
                      <td className="text-xs">{trade.id}</td>
                      <td className="text-xs">{trade.symbolA}</td>
                      <td className="text-xs">{trade.symbolB}</td>
                      <td className="text-xs">{dayjs(trade.openTime).format('DD.MM HH:mm:ss')}</td>
                      <td className="text-xs">{dayjs(trade.closeTime).format('DD.MM HH:mm:ss')}</td>
                      <td className="text-xs">
                        {dayjs(trade.closeTime).diff(dayjs(trade.openTime), 'seconds')}s
                      </td>
                      <td className="text-xs">
                        <span className="badge badge-sm badge-info">
                          {trade.direction === 'buy-sell' ? 'BUY/SELL' : 'SELL/BUY'}
                        </span>
                      </td>
                      <td className="text-xs">
                        {trade.openPriceA.toFixed(assetAPricePrecision)} /{' '}
                        {trade.closePriceA.toFixed(assetAPricePrecision)}
                      </td>
                      <td className="text-xs">
                        {trade.openPriceB.toFixed(assetBPricePrecision)} /{' '}
                        {trade.closePriceB.toFixed(assetBPricePrecision)}
                      </td>
                      <td
                        className={cn('text-xs font-semibold', {
                          'text-success': trade.profitPercent >= 0,
                          'text-error': trade.profitPercent < 0,
                        })}
                      >
                        {trade.profitPercent.toFixed(2)}%
                      </td>
                      <td className="text-xs">{trade.openReason}</td>
                      <td className="text-xs">{trade.closeReason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
