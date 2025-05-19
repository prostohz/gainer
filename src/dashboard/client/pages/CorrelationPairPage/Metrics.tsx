import * as R from 'remeda';

type TProps = {
  correlation: Record<string, number>;
  zScore: Record<string, number>;
  cointegration: Record<string, { isCointegrated: boolean }>;
};

export const Metrics = ({ correlation, zScore, cointegration }: TProps) => {
  const getCorrelationColorClass = (correlation: number) => {
    const absCorrelation = Math.abs(correlation);

    if (absCorrelation < 0.3) return 'text-red-500';
    if (absCorrelation < 0.7) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getZScoreColorClass = (zScore: number) => {
    const zScoreAbs = Math.abs(zScore);

    if (zScoreAbs < 2) return 'text-red-500';
    if (zScoreAbs < 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getCointegrationColorClass = (isCointegrated: boolean) => {
    if (isCointegrated) {
      return 'text-green-500';
    }
    return 'text-red-500';
  };

  const timeframes = R.keys(correlation);

  return (
    <div className="text-md grid grid-cols-10 gap-2">
      <div className="col-span-2 font-semibold" />
      {timeframes.map((timeframe) => (
        <div key={timeframe} className="text-right font-semibold">
          {timeframe}
        </div>
      ))}

      <div className="col-span-2 border-t border-neutral pt-2">Pearson Correlation</div>
      {timeframes.map((timeframe) => {
        const correlationItem = correlation[timeframe];
        const correlationColorClass = getCorrelationColorClass(correlationItem);
        return (
          <div
            key={timeframe}
            className={`${correlationColorClass} text-right border-t border-neutral pt-2`}
          >
            {correlationItem.toFixed(4)}
          </div>
        );
      })}

      <div className="col-span-2 border-t border-neutral pt-2">Z-Score</div>
      {timeframes.map((timeframe) => {
        const zScoreItem = zScore[timeframe];
        const zScoreColorClass = getZScoreColorClass(zScoreItem);
        return (
          <div
            key={timeframe}
            className={`${zScoreColorClass} text-right border-t border-neutral pt-2`}
          >
            {zScoreItem.toFixed(4) || 'N/A'}
          </div>
        );
      })}

      <div className="col-span-2 border-t border-neutral pt-2">Engle Granger</div>
      {timeframes.map((timeframe) => {
        const cointegrationItem = cointegration[timeframe];
        const cointegrationColorClass = getCointegrationColorClass(
          cointegrationItem.isCointegrated,
        );
        return (
          <div
            key={timeframe}
            className={`${cointegrationColorClass} text-right border-t border-neutral pt-2`}
          >
            {cointegrationItem.isCointegrated ? 'Yes' : 'No'}
          </div>
        );
      })}
    </div>
  );
};
