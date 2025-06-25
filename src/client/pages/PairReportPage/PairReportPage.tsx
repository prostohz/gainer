import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { dayjs } from '../../../shared/utils/daytime';
import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';
import { Loader } from '../../shared/ui/Loader';
import { PairReport } from './PairReport';

export const PairReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: report,
    isLoading: isReportLoading,
    refetch,
  } = useQuery({
    queryKey: ['report', id],
    queryFn: () => http.get(`/api/pairReport/${id}`).then((response) => response.data),
  });

  const { mutate: updateReport, isPending: isUpdating } = useMutation({
    mutationFn: (id: string) => http.put(`/api/pairReport/${id}`),
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: deleteReport } = useMutation({
    mutationFn: (id: string) => http.delete(`/api/pairReport/${id}`),
    onSuccess: () => {
      navigate('/pairReport');
    },
  });

  const renderContent = () => {
    if (isReportLoading) {
      return <Loader />;
    }

    if (!report) {
      return <div>No report found</div>;
    }

    return <PairReport report={report} />;
  };

  return (
    <div className="flex flex-col flex-grow">
      <Title value={`Pair Report (${id})`} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          <Link to="/pairReport" className="link link-hover link-primary">
            Pair Report
          </Link>{' '}
          / {report ? dayjs(report.date).format('DD.MM.YYYY HH:mm') : ''}
        </h1>

        {id && (
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => updateReport(id)}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>

            <Link
              className="btn btn-secondary"
              to={`/pairReport/${id}/backtest`}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              Backtest
            </Link>

            <button className="btn btn-error" onClick={() => deleteReport(id)}>
              Delete
            </button>
          </div>
        )}
      </div>

      {renderContent()}
    </div>
  );
};
