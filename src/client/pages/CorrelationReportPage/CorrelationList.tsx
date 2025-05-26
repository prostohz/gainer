import { useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import * as R from 'remeda';
import { Link } from 'react-router-dom';

import { TTimeframe } from '../../../shared/types';
import { useCorrelationReport } from '../../entities/correlationReport';

export const CorrelationList = ({ timeframe }: { timeframe: TTimeframe }) => {
  const { report, isLoading } = useCorrelationReport(timeframe);

  const items = useMemo(() => {
    if (!report) return [];

    return R.pipe(
      report,
      R.entries,
      R.filter(([, correlation]) => correlation !== null),
      R.map(([pair, correlation]) => ({ pair, correlation })),
      R.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)),
    );
  }, [report]);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    const [symbolA, symbolB] = item.pair.split('-');
    const correlationValue = item.correlation.toFixed(2);
    const isPositive = item.correlation > 0;

    return (
      <div
        style={style}
        className="flex items-center px-4 py-2 hover:bg-base-300 transition-colors"
      >
        <div className="flex-grow">
          <Link
            to={`/correlationPair?tickerA=${symbolA}&tickerB=${symbolB}&timeframe=${timeframe}`}
            className="hover:underline"
          >
            {symbolA} - {symbolB}
          </Link>
        </div>
        <div className={`font-mono ${isPositive ? 'text-success' : 'text-error'}`}>
          {isPositive ? '+' : ''}
          {correlationValue}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full flex-grow">
        <div className="loading loading-ring loading-lg" />
      </div>
    );
  }

  if (!report || items.length === 0) {
    return <div className="text-center">No correlation data available</div>;
  }

  return (
    <div className="w-full h-full">
      <div className="bg-base-100 rounded-lg shadow-lg overflow-hidden h-full">
        <div className="flex items-center px-4 py-3 bg-base-200 font-medium">
          <div className="flex-grow">Pair</div>
          <div>Correlation</div>
        </div>
        <FixedSizeList height={800} width="100%" itemCount={items.length} itemSize={40}>
          {Row}
        </FixedSizeList>
      </div>
    </div>
  );
};
