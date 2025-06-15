import { useState } from 'react';
import { FixedSizeList } from 'react-window';
import { Link } from 'react-router-dom';

import { TPairReportList, TTimeframe } from '../../../shared/types';
import { useAvailableHeight } from '../../shared/utils/dom';

type TProps = {
  report: {
    id: string;
    date: number;
    timeframe: TTimeframe;
    data: TPairReportList;
  };
};

export const PairReport = ({ report }: TProps) => {
  const { id, date, timeframe, data } = report;

  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const containerHeight = useAvailableHeight(containerElement);

  const uniqueAssetsCount = new Set(data.map((item) => item.pair.split('-')[0])).size;

  const renderSafeValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toFixed(4);
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = data[index];
    if (!item) {
      return null;
    }

    const { pair, pValue, halfLife, hurstExponent, correlationByPrices, beta } = item;
    const [symbolA, symbolB] = pair.split('-');

    return (
      <div
        style={style}
        className="grid grid-cols-[1fr_repeat(5,120px)] gap-2 items-center px-4 hover:bg-base-300"
      >
        <Link
          to={`/pair?tickerA=${symbolA}&tickerB=${symbolB}&timeframe=${timeframe}`}
          className="hover:underline truncate"
        >
          {symbolA} - {symbolB}
        </Link>

        <div className="text-right font-mono">{renderSafeValue(pValue)}</div>
        <div className="text-right font-mono">{renderSafeValue(halfLife)}</div>
        <div className="text-right font-mono">{renderSafeValue(hurstExponent)}</div>
        <div className="text-right font-mono">{renderSafeValue(correlationByPrices)}</div>
        <div className="text-right font-mono">{renderSafeValue(beta)}</div>
      </div>
    );
  };

  const renderContent = () => {
    if (data.length === 0) {
      return <div className="text-center">No correlation data available</div>;
    }

    return (
      <>
        <div className="grid grid-cols-[1fr_repeat(5,120px)] gap-2 px-4 py-2 font-semibold sticky top-0 z-10 bg-base-300">
          <div>Pair</div>
          <div className="text-right">p-value</div>
          <div className="text-right">Half-life</div>
          <div className="text-right">Hurst</div>
          <div className="text-right">Correlation</div>
          <div className="text-right">Beta</div>
        </div>

        <FixedSizeList width="100%" height={containerHeight} itemCount={data.length} itemSize={60}>
          {Row}
        </FixedSizeList>
      </>
    );
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="card bg-base-200 shadow p-4">
          <div className="text-xs opacity-60 mb-1">Report ID</div>
          <div className="font-semibold text-info truncate" title={id}>
            {id}
          </div>
        </div>

        <div className="card bg-base-200 shadow p-4">
          <div className="text-xs opacity-60 mb-1">Date</div>
          <div className="font-semibold text-info">{new Date(date).toLocaleString()}</div>
        </div>

        <div className="card bg-base-200 shadow p-4">
          <div className="text-xs opacity-60 mb-1">Timeframe</div>
          <div className="font-semibold text-info">{timeframe}</div>
        </div>

        <div className="card bg-base-200 shadow p-4">
          <div className="text-xs opacity-60 mb-1">Pairs found</div>
          <div className="font-semibold text-info">{data.length}</div>
        </div>

        <div className="card bg-base-200 shadow p-4">
          <div className="text-xs opacity-60 mb-1">Assets found</div>
          <div className="font-semibold text-info">{uniqueAssetsCount}</div>
        </div>
      </div>

      <div
        className="overflow-hidden h-full bg-base-200 rounded-lg max-h-[750px]"
        ref={setContainerElement}
      >
        {renderContent()}
      </div>
    </div>
  );
};
