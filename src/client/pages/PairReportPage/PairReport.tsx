import { useState } from 'react';
import { FixedSizeList } from 'react-window';
import { Link } from 'react-router-dom';

import { TPairReportList, TTimeframe } from '../../../shared/types';
import { useAvailableHeight } from '../../shared/utils/dom';

type TProps = {
  timeframe: TTimeframe;
  report: TPairReportList;
};

export const PairReport = ({ timeframe, report }: TProps) => {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const containerHeight = useAvailableHeight(containerElement);

  const HEADER_HEIGHT = 48;

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!report) {
      return null;
    }

    const item = report[index];
    if (!item) {
      return null;
    }

    const { pair, pValue, halfLife, hurstExponent, correlationByPrices, beta } = item;
    const [symbolA, symbolB] = pair.split('-');

    return (
      <div style={style} className="grid grid-cols-[1fr_repeat(5,120px)] gap-2 items-center px-4">
        <Link
          to={`/pair?tickerA=${symbolA}&tickerB=${symbolB}&timeframe=${timeframe}`}
          className="hover:underline truncate"
        >
          {symbolA} - {symbolB}
        </Link>

        <div className="text-right font-mono">{pValue.toFixed(4)}</div>
        <div className="text-right font-mono">{halfLife === null ? '∞' : halfLife.toFixed(4)}</div>
        <div className="text-right font-mono">
          {hurstExponent === null ? 'N/A' : hurstExponent.toFixed(4)}
        </div>
        <div className="text-right font-mono">{correlationByPrices.toFixed(4)}</div>
        <div className="text-right font-mono">{beta.toFixed(4)}</div>
      </div>
    );
  };

  const renderContent = () => {
    if (!report || report.length === 0) {
      return <div className="text-center">No correlation data available</div>;
    }

    return (
      <>
        <div className="grid grid-cols-[1fr_repeat(5,120px)] gap-2 px-4 py-2 font-semibold sticky top-0 z-10">
          <div>Pair</div>
          <div className="text-right">p-value</div>
          <div className="text-right">Half-life</div>
          <div className="text-right">Hurst</div>
          <div className="text-right">Correlation</div>
          <div className="text-right">Beta</div>
        </div>

        <FixedSizeList
          width="100%"
          height={Math.max(0, containerHeight - HEADER_HEIGHT)}
          itemCount={report.length}
          itemSize={60}
        >
          {Row}
        </FixedSizeList>
      </>
    );
  };

  return (
    <div className="w-full h-full" ref={setContainerElement}>
      <div className="overflow-hidden h-full bg-base-200 rounded-lg">{renderContent()}</div>
    </div>
  );
};
