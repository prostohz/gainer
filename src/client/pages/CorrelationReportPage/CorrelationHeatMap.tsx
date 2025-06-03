import { TCorrelationReportFilters, TTimeframe } from '../../../shared/types';
import { Loader } from '../../shared/ui/Loader';
import { HeatMap } from '../../widgets/HeatMap';
import { useCorrelationReportMap } from '../../entities/correlationReport';

type TProps = {
  timeframe: TTimeframe;
  filters: TCorrelationReportFilters;
};

export const CorrelationHeatMap = ({ timeframe, filters }: TProps) => {
  const { report, isLoading } = useCorrelationReportMap(timeframe, filters);

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    if (!report) {
      return <div>No report found</div>;
    }

    return (
      <HeatMap
        report={report}
        field="pValue"
        boundaries={[
          { level: 0, color: 'bg-green-500' },
          { level: 0.01, color: 'bg-lime-500' },
          { level: 0.05, color: 'bg-yellow-500' },
          { level: 0.1, color: 'bg-orange-500' },
          { level: 0.2, color: 'bg-red-500' },
        ]}
      />
    );
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow w-full">
      {renderContent()}
    </div>
  );
};
