import { useMutation } from '@tanstack/react-query';

import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';

export const SystemPage = () => {
  const { mutate: loadCandles, isPending } = useMutation({
    mutationFn: () => {
      return http.post('/api/system/loadCandles');
    },
  });

  return (
    <div className="flex flex-col ">
      <Title value="System" />

      <h1 className="text-2xl font-bold mb-4">System</h1>

      <div className="flex gap-4 items-center justify-between p-4 bg-base-200 rounded-lg">
        <h2 className="text-lg font-bold">Candles</h2>

        <button className="btn btn-primary" onClick={() => loadCandles()} disabled={isPending}>
          {isPending ? 'Loading...' : 'Load Candles'}
        </button>
      </div>
    </div>
  );
};
