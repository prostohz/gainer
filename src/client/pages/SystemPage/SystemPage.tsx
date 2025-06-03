import { useMutation } from '@tanstack/react-query';

import { http } from '../../shared/http';

export const SystemPage = () => {
  const { mutate: loadCandles, isPending } = useMutation({
    mutationFn: () => {
      return http.post('/api/system/loadCandles');
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">System</h1>

      <div className="flex-grow flex flex-row gap-4 justify-between p-4 bg-base-200 rounded-lg">
        <h2 className="text-lg font-bold">Candles</h2>

        <div className="flex flex-row gap-2">
          <button className="btn btn-primary" onClick={() => loadCandles()} disabled={isPending}>
            {isPending ? 'Loading...' : 'Load Candles'}
          </button>
        </div>
      </div>
    </div>
  );
};
