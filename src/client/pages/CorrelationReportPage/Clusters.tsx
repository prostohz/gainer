import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { TCorrelationClusters } from '../../../shared/types';
import { http } from '../../shared/http';
import { useLSState } from '../../shared/localStorage';
import { setFavorites } from '../../widgets/AssetSelector';

export const Clusters = () => {
  const [usdtOnly, setUsdtOnly] = useLSState('usdtOnly', false);
  const [minCorrelation, setMinCorrelation] = useLSState('minCorrelation', 0.9);
  const [minVolume, setMinVolume] = useLSState('minVolume', 10_000_000);

  const { data: clusters, isLoading } = useQuery<TCorrelationClusters>({
    queryKey: ['correlationClusters', usdtOnly, minCorrelation, minVolume],
    queryFn: () =>
      http
        .get('/api/correlation/clusters', { params: { usdtOnly, minCorrelation, minVolume } })
        .then((response) => response.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center flex-grow">
        <div className="loading loading-ring loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow">
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

      {clusters && clusters.length > 0 ? (
        clusters.map((item, index) => (
          <div
            key={index}
            className="bg-base-300 rounded-lg p-4 mb-4 flex flex-row justify-between gap-4"
          >
            <div className="break-words">{item.join(', ')}</div>
            <div className="flex flex-row gap-2 shrink-0">
              <button className="btn btn-sm btn-primary" onClick={() => setFavorites(item)}>
                Add to favorites
              </button>
              <Link
                className="btn btn-sm btn-primary"
                to={`/correlationCluster?symbols=${item.join(',')}`}
              >
                View
              </Link>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center">No clusters</div>
      )}
    </div>
  );
};
