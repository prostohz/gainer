import { useEffect, useRef, createContext, useContext, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  UTCTimestamp,
  SeriesMarker,
  Time,
  createSeriesMarkers,
  IChartApi,
  LogicalRange,
} from 'lightweight-charts';

import { Candle } from '../../server/models/Candle';
import { TCompleteTrade } from '../../server/trading/strategies/MRStrategy/backtest';

type SyncContextType = {
  charts: Set<IChartApi>;
  registerChart: (chart: IChartApi) => void;
  unregisterChart: (chart: IChartApi) => void;
  syncTimeScale: (chart: IChartApi, logicalRange: LogicalRange | null) => void;
};

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const chartsRef = useRef<Set<IChartApi>>(new Set());

  const registerChart = useCallback((chart: IChartApi) => {
    chartsRef.current.add(chart);
  }, []);

  const unregisterChart = useCallback((chart: IChartApi) => {
    chartsRef.current.delete(chart);
  }, []);

  const syncTimeScale = useCallback((sourceChart: IChartApi, logicalRange: LogicalRange | null) => {
    chartsRef.current.forEach((chart) => {
      if (chart !== sourceChart) {
        if (logicalRange) {
          chart.timeScale().setVisibleLogicalRange(logicalRange);
        }
      }
    });
  }, []);

  return (
    <SyncContext.Provider
      value={{
        charts: chartsRef.current,
        registerChart,
        unregisterChart,
        syncTimeScale,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
};

type Props = {
  candles: Candle[];
  trades: TCompleteTrade[];
  precision: number;
  symbol: string;
  title?: string;
};

export const SyncedTradeChart = ({ candles, trades, precision, symbol, title }: Props) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { registerChart, unregisterChart, syncTimeScale } = useSync();

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) {
      return;
    }

    const chartContainer = chartContainerRef.current;
    const chart = createChart(chartContainer, {
      layout: {
        textColor: '#f8f8f2',
        background: { color: '#242530' },
      },
      grid: {
        vertLines: { color: 'rgba(68, 71, 90, 0.2)' },
        horzLines: { color: 'rgba(68, 71, 90, 0.2)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(189, 147, 249, 0.3)',
          width: 1,
          style: 0,
        },
        horzLine: {
          color: 'rgba(189, 147, 249, 0.3)',
          width: 1,
          style: 0,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(68, 71, 90, 0.5)',
      },
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleString();
        },
      },
    });

    chartRef.current = chart;

    registerChart(chart);

    const mainSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#50fa7b',
      downColor: '#ff5555',
      borderUpColor: '#50fa7b',
      borderDownColor: '#ff5555',
      wickUpColor: '#50fa7b',
      wickDownColor: '#ff5555',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(precision),
        minMove: 1 / Math.pow(10, precision),
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#bd93f9',
      priceScaleId: 'volume',
      priceFormat: {
        type: 'volume',
      },
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      visible: true,
    });

    // Подготовка данных свечей
    const candleData = candles.map((candle) => ({
      openTime: candle.openTime,
      time: (Number(candle.openTime) / 1000) as UTCTimestamp,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume),
    }));

    const volumeData = candleData.map((candle) => {
      const isGreen = candle.close >= candle.open;
      return {
        time: (candle.openTime / 1000) as UTCTimestamp,
        value: candle.volume,
        color: isGreen ? 'rgba(80, 250, 123, 0.5)' : 'rgba(255, 85, 85, 0.5)',
      };
    });

    mainSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    const markers: SeriesMarker<Time>[] = [];

    trades.forEach((trade) => {
      const straightDeal = (() => {
        if (trade.direction === 'buy-sell' && trade.symbolA === symbol) {
          return true;
        }

        if (trade.direction === 'sell-buy' && trade.symbolB === symbol) {
          return true;
        }

        return false;
      })();

      const openDealSide = straightDeal ? 'BUY' : 'SELL';
      const closeDealSide = openDealSide === 'BUY' ? 'SELL' : 'BUY';

      const openDealColor = openDealSide === 'BUY' ? '#00ff00' : '#ff1744';
      const closeDealColor = openDealSide === 'BUY' ? '#ff1744' : '#00ff00';

      // Маркер открытия позиции
      markers.push({
        time: (trade.openTime / 1000) as UTCTimestamp,
        position: 'belowBar',
        color: openDealColor,
        shape: 'arrowUp',
        text: `#${trade.id}: Open (${openDealSide})`,
        size: 1,
      });

      // Маркер закрытия позиции
      markers.push({
        time: (trade.closeTime / 1000) as UTCTimestamp,
        position: 'belowBar',
        color: closeDealColor,
        shape: 'arrowUp',
        text: ` #${trade.id}: Close (${closeDealSide})`,
        size: 1,
      });
    });

    createSeriesMarkers(mainSeries, markers);

    chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      syncTimeScale(chart, logicalRange);
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      unregisterChart(chart);
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, trades, precision, symbol, registerChart, unregisterChart, syncTimeScale]);

  return (
    <div className="h-full">
      {title && <h4 className="text-md font-semibold mb-2">{title}</h4>}
      <div
        ref={chartContainerRef}
        className="w-full h-full bg-[#282a36] rounded-lg overflow-hidden"
      />
    </div>
  );
};

export const SyncedChartsContainer = ({ children }: { children: React.ReactNode }) => {
  return <SyncProvider>{children}</SyncProvider>;
};
