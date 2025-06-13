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

  const renderReportMeta = () => {
    if (!report) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 mb-4 justify-end">
        <div>
          <span className="font-bold text-info">{report.data.length}</span> pairs found by
        </div>
        <div>
          <span className="font-bold text-info">
            {dayjs(report.date).format('DD.MM.YYYY hh:mm')}
          </span>{' '}
          by <span className="font-bold text-info">{report.timeframe}</span> timeframe
        </div>
      </div>
    );
  };
  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    if (!report) {
      return <div>No report found</div>;
    }

    return <PairReport timeframe={report.timeframe} report={report.data} />;
  };

  return (
    <div className="flex flex-col flex-grow">
      <Title value={`Pair Report (${id})`} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Pair Report</h1>

        {renderReportMeta()}
      </div>

      {renderContent()}
    </div>
  );
};
