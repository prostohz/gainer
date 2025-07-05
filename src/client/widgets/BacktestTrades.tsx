import cn from 'classnames';

import { TCompleteTrade } from '../../server/trading/strategies/MRStrategy/backtest';
import { dayjs } from '../../shared/utils/daytime';
import { useAssets } from '../entities/assets';
import { BacktestStats } from './BacktestStats';

export const BacktestTrades = ({ trades }: { trades: TCompleteTrade[] }) => {
  const { assetMap, isLoading } = useAssets();

  if (isLoading) {
    return null;
  }

  const renderContent = () => {
    if (trades.length === 0) {
      return <div className="text-base-content text-center p-4">No trades</div>;
    }

    return (
      <div className="bg-base-200 rounded-lg p-4">
        <h4 className="text-md font-semibold mb-3">Trade history</h4>
        <div className="max-h-96 overflow-auto w-full">
          <div className="overflow-x-scroll w-full">
            <div className="w-max">
              <div className="grid grid-cols-[1fr_repeat(11,150px)] gap-2 mb-2 font-semibold text-xs">
                <div>Pair</div>
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

              {trades.map((trade, index) => {
                const assetA = assetMap[trade.symbolA];
                const assetB = assetMap[trade.symbolB];

                const assetAPricePrecision = assetA.pricePrecision;
                const assetBPricePrecision = assetB.pricePrecision;

                return (
                  <div
                    key={index}
                    className={cn(
                      'grid grid-cols-[1fr_repeat(11,150px)] gap-2 py-1 text-xs items-center',
                      {
                        'bg-success/10': trade.roi >= 0,
                        'bg-error/10': trade.roi < 0,
                      },
                    )}
                  >
                    <div className="pl-2">
                      {trade.symbolA} / {trade.symbolB}
                    </div>
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
      <div className="bg-base-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold mb-3">Backtest trades</h3>
        <BacktestStats trades={trades} />
      </div>

      {renderContent()}
    </div>
  );
};
