import { useState, useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import { Link } from 'react-router-dom';

import { dayjs } from '../../../shared/utils/daytime';
import { TPairReportEntry } from '../../../shared/types';
import { useAvailableHeight } from '../../shared/utils/dom';

type TProps = {
  report: {
    id: string;
    date: number;
    data: TPairReportEntry[];
  };
};

type TSortField = keyof TPairReportEntry | 'pair';

export const PairReport = ({ report }: TProps) => {
  const { id, date, data } = report;

  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const containerHeight = useAvailableHeight(containerElement);

  const [search, setSearch] = useState('');

  const [sortField, setSortField] = useState<TSortField>('pair');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const columns: {
    label: string;
    field: TSortField;
    align: 'right' | 'left';
    sortable: boolean;
  }[] = [
    { label: 'Pair', field: 'pair', align: 'left', sortable: true },
    { label: 'p-value', field: 'pValue', align: 'right', sortable: true },
    { label: 'Half-life', field: 'halfLife', align: 'right', sortable: true },
    { label: 'Hurst', field: 'hurstExponent', align: 'right', sortable: true },
    { label: 'Corr (prices)', field: 'correlationByPrices', align: 'right', sortable: true },
    { label: 'Corr (returns)', field: 'correlationByReturns', align: 'right', sortable: true },
    { label: 'Crossings', field: 'crossings', align: 'right', sortable: true },
    { label: 'Spread', field: 'spread', align: 'right', sortable: false },
  ];

  const handleSort = (field: TSortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const { assetA, assetB } = item;

      const pairName = `${assetA.baseAsset}${assetA.quoteAsset}-${assetB.baseAsset}${assetB.quoteAsset}`;

      return pairName.toLowerCase().includes(search.toLowerCase());
    });
  }, [data, search]);

  const sortedData = useMemo(() => {
    const compare = (a: (typeof filteredData)[0], b: (typeof filteredData)[0]) => {
      let valA: TPairReportEntry[keyof TPairReportEntry] | string | null = null;
      let valB: TPairReportEntry[keyof TPairReportEntry] | string | null = null;

      if (sortField === 'pair') {
        valA = `${a.assetA.baseAsset}${a.assetA.quoteAsset}-${a.assetB.baseAsset}${a.assetB.quoteAsset}`;
        valB = `${b.assetA.baseAsset}${b.assetA.quoteAsset}-${b.assetB.baseAsset}${b.assetB.quoteAsset}`;
      } else {
        if (sortField in a && sortField in b) {
          valA = a[sortField];
          valB = b[sortField];
        } else {
          return 0;
        }
      }

      const isNullA = valA === null || valA === undefined;
      const isNullB = valB === null || valB === undefined;

      if (isNullA && isNullB) return 0;
      if (isNullA) return 1;
      if (isNullB) return -1;

      if (valA! < valB!) return sortDirection === 'asc' ? -1 : 1;
      if (valA! > valB!) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    };

    return [...filteredData].sort(compare);
  }, [filteredData, sortField, sortDirection]);

  const uniqueAssetsCount = new Set(
    data.flatMap((item) => [
      `${item.assetA.baseAsset}${item.assetA.quoteAsset}`,
      `${item.assetB.baseAsset}${item.assetB.quoteAsset}`,
    ]),
  ).size;

  const renderSafeValue = (value: number | null) => {
    if (value === null) return 'N/A';

    const absValue = Math.abs(value);
    const precisionMap = [
      { threshold: 10, precision: 4 },
      { threshold: 100, precision: 3 },
      { threshold: 1000, precision: 2 },
      { threshold: 10000, precision: 1 },
    ];

    const precision = precisionMap.find(({ threshold }) => absValue <= threshold)?.precision ?? 0;
    return value.toFixed(precision);
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = sortedData[index];
    if (!item) {
      return null;
    }

    const {
      assetA,
      assetB,
      pValue,
      halfLife,
      hurstExponent,
      correlationByPrices,
      correlationByReturns,
      crossings,
      spread,
    } = item;

    const symbolA = `${assetA.baseAsset}${assetA.quoteAsset}`;
    const symbolB = `${assetB.baseAsset}${assetB.quoteAsset}`;

    return (
      <div
        style={style}
        className="grid grid-cols-[1fr_repeat(7,130px)] gap-2 items-center px-4 hover:bg-base-300/70 text-sm"
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
        <div className="text-right font-mono">{crossings}</div>
        <div className="text-right font-mono">
          {spread && (
            <div className="flex flex-col gap-1">
              <div className="truncate">μ: {renderSafeValue(spread.mean)}</div>
              <div className="truncate">Med: {renderSafeValue(spread.median)}</div>
              <div className="truncate">σ: {renderSafeValue(spread.std)}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (data.length === 0) {
      return <div className="text-base-content text-center p-4">No correlation data available</div>;
    }

    return (
      <div className="px-4 py-4 font-semibold bg-base-200">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            className="input input-bordered w-full max-w-[300px]"
            value={search}
            placeholder="Search by quote asset name"
            onChange={(e) => setSearch(e.target.value)}
          />

          <div>
            Found: <span className="font-semibold text-info">{filteredData.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_repeat(7,130px)] gap-2 bg-base-300 p-4">
          {columns.map(({ label, field, align, sortable }) => (
            <div
              key={field}
              role="button"
              onClick={() => sortable && handleSort(field)}
              className={[
                'cursor-pointer select-none flex items-center gap-1',
                align === 'right' ? 'text-right justify-end' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{label}</span>
              {sortable && sortField === field && (
                <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
              )}
            </div>
          ))}
        </div>

        <FixedSizeList
          width="100%"
          height={containerHeight}
          itemCount={sortedData.length}
          itemSize={85}
        >
          {Row}
        </FixedSizeList>
      </div>
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
          <div className="font-semibold text-info">{dayjs(date).format('DD.MM.YYYY HH:mm')}</div>
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
