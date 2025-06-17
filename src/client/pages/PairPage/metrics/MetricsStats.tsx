import * as R from 'remeda';

import { TCointegration } from '../../../../shared/types';

type TMetric<T> = Record<string, T | null>;
type TProps = {
  correlationByPrices: TMetric<number>;
  correlationByReturns: TMetric<number>;
  zScoreByPrices: TMetric<number>;
  zScoreByReturns: TMetric<number>;
  cointegration: TMetric<TCointegration>;
  betaHedge: TMetric<number>;
};

export const MetricsStats = ({
  correlationByPrices,
  correlationByReturns,
  zScoreByPrices,
  zScoreByReturns,
  cointegration,
  betaHedge,
}: TProps) => {
  const getCorrelationColorClass = (correlation: number | null) => {
    if (correlation === null) return 'text-neutral';

    const absCorrelation = Math.abs(correlation);

    if (absCorrelation < 0.7) return 'text-red-500';
    if (absCorrelation < 0.9) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getZScoreColorClass = (zScore: number | null) => {
    if (zScore === null) return 'text-neutral';

    const zScoreAbs = Math.abs(zScore);

    if (zScoreAbs < 2) return 'text-red-500';
    if (zScoreAbs < 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getCointegrationColorClass = (cointegration: TCointegration | null) => {
    if (cointegration === null) return 'text-neutral';

    if (cointegration.pValue < 0.01) return 'text-green-500';
    if (cointegration.pValue < 0.05) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBetaHedgeColorClass = (betaHedge: number | null) => {
    if (betaHedge === null) return 'text-neutral';

    return 'text-green-500';
  };

  const timeframes = R.keys(correlationByPrices);

  const renderSafeValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toFixed(4);
  };

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
            {renderSafeValue(correlationItem)}
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
            {renderSafeValue(correlationItem)}
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
            {renderSafeValue(zScoreItem)}
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
            {renderSafeValue(zScoreItem)}
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
            {renderSafeValue(cointegrationItem?.pValue ?? null)}
          </div>
        );
      })}

      <div className="col-span-2 border-t border-neutral pt-2">Beta Hedge</div>
      {timeframes.map((timeframe) => {
        const betaHedgeItem = betaHedge[timeframe];
        const betaHedgeColorClass = getBetaHedgeColorClass(betaHedgeItem);
        return (
          <div
            key={timeframe}
            className={`${betaHedgeColorClass} text-right border-t border-neutral pt-2`}
          >
            {renderSafeValue(betaHedgeItem)}
          </div>
        );
      })}
    </div>
  );
};
