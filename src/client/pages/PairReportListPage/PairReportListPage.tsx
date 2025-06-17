import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { http } from '../../shared/utils/http';
import { Loader } from '../../shared/ui/Loader';
import { TPairReportMeta } from '../../../shared/types';
import { useLSState } from '../../shared/utils/localStorage';
import { DateTimePicker } from '../../shared/ui/Calendar';
import { Title } from '../../shared/utils/Title';

export const PairReportListPage = () => {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useLSState<number>('reportSelectedDate', Date.now());

  const {
    data: reportList,
    isLoading,
    refetch,
  } = useQuery<TPairReportMeta[]>({
    queryKey: ['pairReportList'],
    queryFn: () => http.get('/api/pairReport').then((response) => response.data),
  });

  const { mutate: createReport, isPending } = useMutation({
    mutationFn: () =>
      http.post('/api/pairReport', null, {
        params: { date: selectedDate },
      }),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: updateReport, isPending: isUpdating } = useMutation({
    mutationFn: (id: string) => http.put(`/api/pairReport/${id}`),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: deleteReport, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => http.delete(`/api/pairReport/${id}`),
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col">
      <Title value="Pair Report" />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Pair Report</h1>
      </div>

      <div className="flex gap-2 justify-between mb-4">
        <div className="flex gap-2">
          <DateTimePicker
            value={new Date(selectedDate)}
            onChange={(date) => setSelectedDate((date as Date).getTime())}
            className="min-w-56"
            placeholder="Select date"
            disabled={isPending}
          />
        </div>

        <button className="btn btn-primary" onClick={() => createReport()} disabled={isPending}>
          {isPending ? 'Creating...' : 'Create New Report'}
        </button>
      </div>

      <div className="flex flex-col gap-2 bg-base-200 rounded-lg p-4">
        {reportList && reportList?.length > 0 ? (
          reportList.map((report) => (
            <div
              key={report.id}
              className="flex justify-between items-center hover:cursor-pointer"
              onClick={() => {
                navigate(`/pairReport/${report.id}`);
              }}
            >
              <div className="flex gap-2 items-center text-sm text-secondary">
                {format(new Date(report.date), 'dd.MM.yyyy hh:mm')}
              </div>

              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-outline btn-sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    updateReport(report.id);
                  }}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update'}
                </button>

                <button
                  className="btn btn-error btn-sm btn-outline"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    deleteReport(report.id);
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-neutral-content">No reports</div>
        )}
      </div>
    </div>
  );
};
