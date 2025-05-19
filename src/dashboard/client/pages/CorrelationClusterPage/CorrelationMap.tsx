import * as R from 'remeda';

export const CorrelationMap = ({ assetZScore }: { assetZScore: Record<string, number> }) => {
  const getColorClass = (zScore: number) => {
    const zScoreAbs = Math.abs(zScore);

    if (zScoreAbs < 2) return 'bg-red-500';
    if (zScoreAbs < 3) return 'bg-yellow-500';
    if (zScoreAbs < 4) return 'bg-green-500';

    return 'bg-blue-500';
  };

  return (
    <div>
      {R.entries(assetZScore).map(([pair, zScore], index) => {
        const [tickerA, tickerB] = pair.split('-');
        return (
          <div
            key={index}
            className={getColorClass(zScore)}
            onClick={() => {
              if (zScore !== null) {
                // open new tab
                window.open(`/correlationPair?tickerA=${tickerA}&tickerB=${tickerB}`, '_blank');
              }
            }}
          >
            {pair}: {zScore.toFixed(2)}
          </div>
        );
      })}
    </div>
  );
};
