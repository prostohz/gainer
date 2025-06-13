import * as R from 'remeda';

import { TCointegration } from '../../../../shared/types';

const ROUND_PRECISION = 4;

type TProps = {
  correlationByPrices: Record<string, number>;
  correlationByReturns: Record<string, number>;
  zScoreByPrices: Record<string, number>;
  zScoreByReturns: Record<string, number>;
  cointegration: Record<string, TCointegration>;
};

export const MetricsStats = ({
  correlationByPrices,
  correlationByReturns,
  zScoreByPrices,
  zScoreByReturns,
  cointegration,
}: TProps) => {
  const getCorrelationColorClass = (correlation: number) => {
    const absCorrelation = Math.abs(correlation);

    if (absCorrelation < 0.3) return 'text-red-500';
    if (absCorrelation < 0.7) return 'text-yellow-500';
    return 'text-lime-500';
  };

  const getZScoreColorClass = (zScore: number) => {
    const zScoreAbs = Math.abs(zScore);

    if (zScoreAbs < 2) return 'text-red-500';
    if (zScoreAbs < 3) return 'text-yellow-500';
    return 'text-lime-500';
  };

  const getCointegrationColorClass = (cointegration: TCointegration) => {
    if (cointegration.pValue < 0.01) return 'text-green-500';
    if (cointegration.pValue < 0.05) return 'text-lime-500';
    if (cointegration.pValue < 0.1) return 'text-yellow-500';
    if (cointegration.pValue < 0.2) return 'text-orange-500';
    return 'text-red-500';
  };

  const timeframes = R.keys(correlationByPrices);

  return (
    <div className="text-md grid grid-cols-9 gap-2">
      <div className="col-span-2 font-semibold" />
      {timeframes.map((timeframe) => (
        <div key={timeframe} className="text-right font-semibold">
          {timeframe}
        </div>
      ))}

      <div className="col-span-2 border-t border-neutral pt-2">Pearson Correlation by prices</div>
      {timeframes.map((timeframe) => {
        const correlationItem = correlationByPrices[timeframe];
        const correlationColorClass = getCorrelationColorClass(correlationItem);
        return (
          <div
            key={timeframe}
            className={`${correlationColorClass} text-right border-t border-neutral pt-2`}
          >
            {correlationItem.toFixed(ROUND_PRECISION)}
          </div>
        );
      })}

      <div className="col-span-2 border-t border-neutral pt-2">Pearson Correlation by returns</div>
      {timeframes.map((timeframe) => {
        const correlationItem = correlationByReturns[timeframe];
        const correlationColorClass = getCorrelationColorClass(correlationItem);
        return (
          <div
            key={timeframe}
            className={`${correlationColorClass} text-right border-t border-neutral pt-2`}
          >
            {correlationItem.toFixed(ROUND_PRECISION)}
          </div>
        );
      })}

      <div className="col-span-2 border-t border-neutral pt-2">Z-Score by prices</div>
      {timeframes.map((timeframe) => {
        const zScoreItem = zScoreByPrices[timeframe];
        const zScoreColorClass = getZScoreColorClass(zScoreItem);
        return (
          <div
            key={timeframe}
            className={`${zScoreColorClass} text-right border-t border-neutral pt-2`}
          >
            {zScoreItem.toFixed(ROUND_PRECISION) || 'N/A'}
          </div>
        );
      })}

      <div className="col-span-2 border-t border-neutral pt-2">Z-Score by returns</div>
      {timeframes.map((timeframe) => {
        const zScoreItem = zScoreByReturns[timeframe];
        const zScoreColorClass = getZScoreColorClass(zScoreItem);
        return (
          <div
            key={timeframe}
            className={`${zScoreColorClass} text-right border-t border-neutral pt-2`}
          >
            {zScoreItem.toFixed(ROUND_PRECISION) || 'N/A'}
          </div>
        );
      })}

      <div className="col-span-2 border-t border-neutral pt-2">Engle Granger (p-value)</div>
      {timeframes.map((timeframe) => {
        const cointegrationItem = cointegration[timeframe];
        const cointegrationColorClass = getCointegrationColorClass(cointegrationItem);
        return (
          <div
            key={timeframe}
            className={`${cointegrationColorClass} text-right border-t border-neutral pt-2`}
          >
            {cointegrationItem.pValue.toFixed(ROUND_PRECISION)}
          </div>
        );
      })}
    </div>
  );
};
