import * as R from 'remeda';

import {
  TCorrelationReport,
  TCorrelationReportRecord,
} from '../../../server/services/correlationService/types';
import { buildCompleteGraphs } from '../../shared/math';
import { useAssets } from '../../entities/assets';
import { useLSState } from '../../shared/localStorage';

type TProps = {
  report: TCorrelationReport;
};

export const CorrelationClusters = ({ report }: TProps) => {
  const { assetMap } = useAssets();

  const [usdtOnly, setUsdtOnly] = useLSState('usdtOnly', false);
  const [minCorrelation, setMinCorrelation] = useLSState('minCorrelation', 0.9);
  const [minVolume, setMinVolume] = useLSState('minVolume', 10_000_000);

  const processedPairs = new Set<string>();

  const correlationEdges = R.pipe(
    report,
    R.entries,
    R.filter(
      (
        entry: [string, TCorrelationReportRecord],
      ): entry is [string, NonNullable<TCorrelationReportRecord>] => Boolean(entry[1]),
    ),
    R.filter(([key]) => {
      const [first, second] = key.split('-');

      if (usdtOnly) {
        return first.endsWith('USDT') && second.endsWith('USDT');
      }

      return true;
    }),
    R.filter(([key, correlationRecord]) => {
      const [first, second] = key.split('-');

      const firstAsset = assetMap[first];
      const secondAsset = assetMap[second];

      if (!firstAsset || !secondAsset) {
        return false;
      }

      return (
        (firstAsset.usdtVolume > minVolume || secondAsset.usdtVolume > minVolume) &&
        correlationRecord > minCorrelation
      );
    }),
    R.sort(([, a], [, b]) => b - a),
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
      <div className="flex flex-row gap-8 items-center mb-4">
        <div className="flex flex-row gap-2 items-center">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={usdtOnly}
            onChange={() => setUsdtOnly(!usdtOnly)}
            id="usdtOnly"
          />
          <label className="text-sm" htmlFor="usdtOnly">
            USDT only
          </label>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            className="input input-sm input-primary w-24"
            id="minCorrelation"
            value={minCorrelation}
            onChange={(e) => setMinCorrelation(Number(e.target.value))}
          />

          <label className="text-sm" htmlFor="minCorrelation">
            Min correlation
          </label>
        </div>

        <div className="flex flex-row gap-2 items-center">
          <input
            type="number"
            min="0"
            step="1"
            className="input input-sm input-primary w-48"
            id="minVolume"
            value={minVolume}
            onChange={(e) => setMinVolume(Number(e.target.value))}
          />

          <label className="text-sm" htmlFor="minVolume">
            Min volume
          </label>
        </div>
      </div>

      {correlationCompleteGraphs.length > 0 ? (
        correlationCompleteGraphs.map((graph, index) => (
          <div key={index} className="bg-base-300 rounded-lg p-4 mb-4">
            {graph.join(', ')}
          </div>
        ))
      ) : (
        <div className="text-center">No clusters</div>
      )}
    </div>
  );
};
