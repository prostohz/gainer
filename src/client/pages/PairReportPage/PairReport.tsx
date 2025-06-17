import { useState, useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import { Link } from 'react-router-dom';

import { TPairReportList } from '../../../shared/types';
import { useAvailableHeight } from '../../shared/utils/dom';

type TProps = {
  report: {
    id: string;
    date: number;
    data: TPairReportList;
  };
};

export const PairReport = ({ report }: TProps) => {
  const { id, date, data } = report;

  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const containerHeight = useAvailableHeight(containerElement);

  const [sortField, setSortField] = useState<keyof TPairReportList[0]>('pair');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const columns: {
    label: string;
    field: typeof sortField;
    align: 'right' | 'left';
  }[] = [
    { label: 'Pair', field: 'pair', align: 'left' },
    { label: 'p-value', field: 'pValue', align: 'right' },
    { label: 'Half-life', field: 'halfLife', align: 'right' },
    { label: 'Hurst', field: 'hurstExponent', align: 'right' },
    { label: 'Corr (prices)', field: 'correlationByPrices', align: 'right' },
    { label: 'Corr (returns)', field: 'correlationByReturns', align: 'right' },
    { label: 'Beta', field: 'beta', align: 'right' },
    { label: 'Crossings', field: 'crossings', align: 'right' },
  ];

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    const compare = (a: (typeof data)[0], b: (typeof data)[0]) => {
      const valA = a[sortField];
      const valB = b[sortField];

      const isNullA = valA === null || valA === undefined;
      const isNullB = valB === null || valB === undefined;

      if (isNullA && isNullB) return 0;
      if (isNullA) return 1;
      if (isNullB) return -1;

      if (valA! < valB!) return sortDirection === 'asc' ? -1 : 1;
      if (valA! > valB!) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    };

    return [...data].sort(compare);
  }, [data, sortField, sortDirection]);

  const uniqueAssetsCount = new Set(data.map((item) => item.pair.split('-')[0])).size;

  const renderSafeValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toFixed(4);
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = sortedData[index];
    if (!item) {
      return null;
    }

    const {
      pair,
      pValue,
      halfLife,
      hurstExponent,
      correlationByPrices,
      correlationByReturns,
      beta,
      crossings,
    } = item;
    const [symbolA, symbolB] = pair.split('-');

    return (
      <div
        style={style}
        className="grid grid-cols-[1fr_repeat(7,130px)] gap-2 items-center px-4 hover:bg-base-300"
      >
        <Link
          to={`/pair?tickerA=${symbolA}&tickerB=${symbolB}&date=${date}`}
          className="hover:underline truncate"
        >
          {symbolA} - {symbolB}
        </Link>

        <div className="text-right font-mono">{renderSafeValue(pValue)}</div>
        <div className="text-right font-mono">{renderSafeValue(halfLife)}</div>
        <div className="text-right font-mono">{renderSafeValue(hurstExponent)}</div>
        <div className="text-right font-mono">{renderSafeValue(correlationByPrices)}</div>
        <div className="text-right font-mono">{renderSafeValue(correlationByReturns)}</div>
        <div className="text-right font-mono">{renderSafeValue(beta)}</div>
        <div className="text-right font-mono">{crossings}</div>
      </div>
    );
  };

  const renderContent = () => {
    if (data.length === 0) {
      return <div className="text-base-content text-center p-4">No correlation data available</div>;
    }

    return (
      <>
        <div className="grid grid-cols-[1fr_repeat(7,130px)] gap-2 px-4 py-4 font-semibold sticky top-0 z-10 bg-base-300">
          {columns.map(({ label, field, align }) => (
            <div
              key={field}
              role="button"
              onClick={() => handleSort(field)}
              className={[
                'cursor-pointer select-none flex items-center gap-1',
                align === 'right' ? 'text-right justify-end' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{label}</span>
              {sortField === field && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
            </div>
          ))}
        </div>

        <FixedSizeList
          width="100%"
          height={containerHeight}
          itemCount={sortedData.length}
          itemSize={60}
        >
          {Row}
        </FixedSizeList>
      </>
    );
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
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
