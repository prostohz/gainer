import EventEmitter from 'events';
import { Op } from 'sequelize';

import { timeframeToMilliseconds } from '../../utils/timeframe';
import { TTimeframe } from '../../../shared/types';
import { TCandle } from '../providers/Binance/BinanceHTTPClient';
import { TBinanceTrade, TStreamSubscription } from '../providers/Binance/BinanceStreamClient';
import { Candle } from '../../models/Candle';
import { TDateTimeProvider, TDataProvider, TStreamDataProvider, TTimeEnvironment } from './types';

export class FakeDateTimeProvider implements TDateTimeProvider {
  constructor(private readonly timeEnvironment: TTimeEnvironment) {
    this.timeEnvironment = timeEnvironment;
  }

  now(): number {
    return this.timeEnvironment.currentTime;
  }
}

export class FakeDataProvider implements TDataProvider {
  constructor(private readonly timeEnvironment: TTimeEnvironment) {
    this.timeEnvironment = timeEnvironment;
  }

  async fetchAssetCandles(
    symbol: string,
    timeframe: TTimeframe,
    limit: number,
  ): Promise<TCandle[]> {
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

    return Promise.resolve(candles.reverse());
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
