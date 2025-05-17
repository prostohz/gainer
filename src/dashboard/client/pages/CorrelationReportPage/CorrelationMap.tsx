import React, { useRef, useEffect } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import * as R from 'remeda';
import { VariableSizeGrid as Grid } from 'react-window';

import { TCorrelationReport } from '../../../server/services/correlationService/types';

export const CorrelationMap = ({ report }: { report: TCorrelationReport }) => {
  const navigate = useNavigate();

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const gridRef = useRef<Grid>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const symbols = useMemo(() => {
    if (!report) {
      return [];
    }

    const symbols = R.keys(report).reduce((acc, key) => {
      const [symbolA, symbolB] = key.split('-');
      acc.add(symbolA);
      acc.add(symbolB);
      return acc;
    }, new Set<string>());

    return Array.from(symbols);
  }, [report]);

  const updateSize = () => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();

      setContainerSize({
        width,
        height,
      });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    updateSize();
  }, [symbols]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.resetAfterColumnIndex(0);
      gridRef.current.resetAfterRowIndex(0);
    }
  }, [symbols, containerSize]);

  const getCorrelationValue = (symbolA: string, symbolB: string) =>
    report[`${symbolA}-${symbolB}`] || null;

  const getCorrelationColor = (value: number | null) => {
    if (value === null) return 'neutral';

    const absValue = Math.abs(value);
    if (absValue > 0.9) return 'bg-green-500';
    if (absValue > 0.6) return 'bg-yellow-500';
    if (absValue > 0.3) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getColumnWidth = (index: number) => (index === 0 ? 100 : 70);
  const getRowHeight = (index: number) => (index === 0 ? 40 : 30);

  const Cell = ({
    columnIndex,
    rowIndex,
    style,
  }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    if (columnIndex === 0 && rowIndex > 0) {
      return (
        <div
          style={style}
          className="bg-base-200 p-1 text-xs font-bold text-info flex items-center justify-start sticky left-0 z-10"
        >
          {symbols[rowIndex - 1]}
        </div>
      );
    }

    if (rowIndex === 0 && columnIndex > 0) {
      return (
        <div
          style={style}
          className="bg-base-200 p-1 text-xs font-bold text-info flex items-center justify-center sticky top-0 z-10"
        >
          {symbols[columnIndex - 1]}
        </div>
      );
    }

    if (rowIndex === 0 && columnIndex === 0) {
      return <div style={style} className="bg-base-200 p-1 sticky top-0 left-0 z-20" />;
    }

    const rowSymbol = symbols[rowIndex - 1];
    const colSymbol = symbols[columnIndex - 1];
    const value = getCorrelationValue(rowSymbol, colSymbol);

    return (
      <div style={style} className="bg-base-200 p-0.5">
        <div
          className={cn(getCorrelationColor(value), 'w-full h-full', {
            'hover:bg-opacity-70 transition-colors hover:cursor-pointer': value !== null,
          })}
          onClick={() => {
            if (value !== null) {
              navigate(`/correlationPair?tickerA=${rowSymbol}&tickerB=${colSymbol}`);
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className="bg-base-200 rounded-lg p-4 flex-grow" ref={containerRef}>
      {report && (
        <div className="p-0.5 overflow-hidden">
          {containerSize.width > 0 && symbols.length > 0 && (
            <Grid
              ref={gridRef}
              columnCount={symbols.length + 1}
              columnWidth={getColumnWidth}
              height={containerSize.height}
              rowCount={symbols.length + 1}
              rowHeight={getRowHeight}
              width={containerSize.width}
              itemData={symbols}
              overscanRowCount={5}
              overscanColumnCount={5}
            >
              {Cell}
            </Grid>
          )}
        </div>
      )}
    </div>
  );
};
