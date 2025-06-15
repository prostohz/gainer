import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { http } from '../../shared/utils/http';
import { Title } from '../../shared/utils/Title';
import { Loader } from '../../shared/ui/Loader';
import { PairReport } from './PairReport';

export const PairReportPage = () => {
  const { id } = useParams();

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => http.get(`/api/pairReport/${id}`).then((response) => response.data),
  });

  const renderContent = () => {
    if (isLoading) {
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
        <h1 className="text-2xl font-bold">Pair Report</h1>
      </div>

      {renderContent()}
    </div>
  );
};
