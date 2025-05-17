import * as R from 'remeda';

import { TCorrelation } from '../../../server/services/correlationService/types';
import { buildCompleteGraphs } from '../../shared/math';
type TProps = {
  report: Record<string, TCorrelation | null>;
  minCorrelation: number;
};

export const CorrelationClusters = ({ report, minCorrelation }: TProps) => {
  const processedPairs = new Set<string>();

  const correlationEdges = R.pipe(
    report,
    R.entries,
    R.filter((entry: [string, TCorrelation | null]): entry is [string, TCorrelation] =>
      Boolean(entry[1]),
    ),
    R.filter(([, correlation]) => correlation.overall > minCorrelation),
    R.sort(([, a], [, b]) => b.overall - a.overall),
    R.filter(([key]) => {
      const [first, second] = key.split('-');
      const reversePair = `${second}-${first}`;

      if (processedPairs.has(reversePair)) {
        return false;
      }

      processedPairs.add(key);
      return true;
    }),
    R.map(([key]) => key),
  );

  const correlationCompleteGraphs = buildCompleteGraphs(correlationEdges);

  return (
    <div className="bg-base-200 rounded-lg p-4">
      {correlationCompleteGraphs.length === 0 && <div className="text-center">No clusters</div>}

      {correlationCompleteGraphs.map((graph, index) => (
        <div key={index} className="bg-base-300 rounded-lg p-4 mb-4">
          {graph.join(', ')}
        </div>
      ))}
    </div>
  );
};
