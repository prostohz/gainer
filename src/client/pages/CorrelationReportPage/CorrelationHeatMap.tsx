import { TTimeframe } from '../../../shared/types';
import { HeatMap } from '../../widgets/HeatMap';
import { useCorrelationReport } from '../../entities/correlationReport';

export const CorrelationHeatMap = ({ timeframe }: { timeframe: TTimeframe }) => {
  const { report, isLoading } = useCorrelationReport(timeframe);

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading loading-ring loading-lg" />;
    }

    if (!report) {
      return <div>No report found</div>;
    }

    return (
      <HeatMap
        report={report}
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
