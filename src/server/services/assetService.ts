import { Op } from 'sequelize';

import { TTimeframe } from '../../shared/types';
import BinanceHTTPClient from '../trading/providers/Binance/BinanceHTTPClient';
import { Asset } from '../models/Asset';
import { Candle } from '../models/Candle';

const binanceHttpClient = BinanceHTTPClient.getInstance();

export const getAssetList = () => {
  return Asset.findAll();
};

export const getAssetCandles = async ({
  symbol,
  timeframe,
  startTimestamp,
  endTimestamp,
  limit,
}: {
  symbol: string;
  timeframe: TTimeframe;
  startTimestamp?: number;
  endTimestamp?: number;
  limit?: number;
}) => {
  const asset = await Asset.findOne({
    where: {
      symbol,
    },
  });

  if (!asset) {
    throw new Error(`Asset ${symbol} not found`);
  }

  const query = {
    symbol: asset.symbol,
    timeframe,
  } as Record<string, unknown>;

  if (startTimestamp || endTimestamp) {
    const openTimeQuery: Record<symbol, number> = {};

    if (startTimestamp) {
      openTimeQuery[Op.gte] = startTimestamp;
    }

    if (endTimestamp) {
      openTimeQuery[Op.lte] = endTimestamp;
    }

    query.openTime = openTimeQuery;
  }

  if (limit) {
    query.limit = limit;
  }

  return Candle.findAll({
    where: query,
    order: [['openTime', 'ASC']],
  });
};

export const getAssetPrice = async (symbol: string) => {
  return binanceHttpClient.fetchAssetPrice(symbol);
};
