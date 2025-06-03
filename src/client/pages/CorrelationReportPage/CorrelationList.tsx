import { useState } from 'react';
import { FixedSizeList } from 'react-window';
import { Link } from 'react-router-dom';

import { TTimeframe, TCorrelationReportFilters } from '../../../shared/types';
import { Loader } from '../../shared/ui/Loader';
import { useCorrelationReportList } from '../../entities/correlationReport';
import { useAvailableHeight } from '../../shared/dom';

type TProps = {
  timeframe: TTimeframe;
  filters: TCorrelationReportFilters;
};

export const CorrelationList = ({ timeframe, filters }: TProps) => {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const containerHeight = useAvailableHeight(containerElement);

  const { report, isLoading } = useCorrelationReportList(timeframe, filters);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!report) {
      return null;
    }

    const item = report[index];
    if (!item) {
      return null;
    }

    const { pair, pValue, halfLife } = item;
    const [symbolA, symbolB] = pair.split('-');

    const isPositive = halfLife !== null && pValue > 0;

    return (
      <div
        style={style}
        className="bg-base-300 rounded-lg flex flex-row px-4 items-center justify-between"
      >
        <div className="flex-grow">
          <Link
            to={`/pair?tickerA=${symbolA}&tickerB=${symbolB}&timeframe=${timeframe}`}
            className="hover:underline"
          >
            {symbolA} - {symbolB}
          </Link>
        </div>

        <div className="flex flex-row gap-2">
          <div className={`font-mono ${isPositive ? 'text-success' : 'text-error'}`}>
            {pValue.toFixed(2)}
          </div>
          <div className="font-mono">{halfLife === null ? '∞' : halfLife.toFixed(2)}</div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    if (!report || report.length === 0) {
      return <div className="text-center">No correlation data available</div>;
    }

    return (
      <FixedSizeList width="100%" height={containerHeight} itemCount={report.length} itemSize={60}>
        {Row}
      </FixedSizeList>
    );
  };

  return (
    <div className="w-full h-full" ref={setContainerElement}>
      <div className="overflow-hidden h-full">{renderContent()}</div>
    </div>
  );
};
