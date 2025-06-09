import { EventEmitter } from 'events';

import { TTimeframe } from '../../../shared/types';
import { TCandle } from '../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade, TStreamSubscription } from '../providers/Binance/BinanceStreamClient';

export interface TDataProvider {
  fetchAssetCandles: ({
    symbol,
    timeframe,
    limit,
  }: {
    symbol: string;
    timeframe: TTimeframe;
    limit: number;
  }) => Promise<TCandle[]>;
}

export interface TStreamDataProvider extends EventEmitter {
  subscribeMultiple: (subscriptions: TStreamSubscription[]) => void;
  unsubscribeMultiple: (subscriptions: TStreamSubscription[]) => void;
  on(event: 'trade', listener: (data: TBinanceTrade) => void): this;
}

export type TEnvironment = {
  dataProvider: TDataProvider;
  streamDataProvider: TStreamDataProvider;
};

export type TTimeEnvironment = {
  currentTime: number;
};
