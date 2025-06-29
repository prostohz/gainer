import EventEmitter from 'events';
import { Op } from 'sequelize';

import { timeframeToMilliseconds } from '../../utils/timeframe';
import { TTimeframe } from '../../../shared/types';
import { TCandle } from '../providers/Binance/spot/BinanceHTTPClient';
import { TBinanceTrade, TStreamSubscription } from '../providers/Binance/spot/BinanceStreamClient';
import { Candle } from '../../models/Candle';
import { TDataProvider, TStreamDataProvider, TTimeEnvironment } from './types';

export class FakeDataProvider implements TDataProvider {
  private candleCache: Map<string, TCandle[]>;

  constructor(private readonly timeEnvironment: TTimeEnvironment) {
    this.timeEnvironment = timeEnvironment;
    this.candleCache = new Map<string, TCandle[]>();
  }

  async fetchAssetCandles({
    symbol,
    timeframe,
    limit,
  }: {
    symbol: string;
    timeframe: TTimeframe;
    limit: number;
  }): Promise<TCandle[]> {
    const key = `${symbol}-${timeframe}-${limit}`;
    if (this.candleCache.has(key)) {
      return this.candleCache.get(key)!;
    }

    const candles = await Candle.findAll({
      where: {
        symbol,
        timeframe,
        openTime: {
          [Op.gte]: this.timeEnvironment.currentTime - timeframeToMilliseconds(timeframe) * limit,
          [Op.lte]: this.timeEnvironment.currentTime,
        },
      },
      limit,
      order: [['openTime', 'DESC']],
    });

    this.candleCache.set(key, candles.reverse());

    return this.candleCache.get(key)!;
  }
}

export class FakeStreamDataProvider extends EventEmitter implements TStreamDataProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async subscribeMultiple(subscriptions: TStreamSubscription[]): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unsubscribeMultiple(subscriptions: TStreamSubscription[]): void {
    return;
  }

  on(event: 'trade', listener: (data: TBinanceTrade) => void): this {
    super.on(event, listener);
    return this;
  }

  emit(event: 'trade', data: TBinanceTrade): boolean {
    return super.emit(event, data);
  }
}
