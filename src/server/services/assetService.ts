import { TTimeframe } from '../../shared/types';
import BinanceHTTPClient from '../trading/providers/Binance/BinanceHTTPClient';
import { Asset } from '../models/Asset';
import { Candle } from '../models/Candle';

const binanceHttpClient = BinanceHTTPClient.getInstance();

export const getAssetList = () => {
  return Asset.findAll();
};

export const getAssetCandles = async (
  symbol: string,
  timeframe: TTimeframe,
  limit: number = 1000,
) => {
  const asset = await Asset.findOne({
    where: {
      symbol,
    },
  });

  if (!asset) {
    throw new Error(`Asset ${symbol} not found`);
  }

  return Candle.findAll({
    where: {
      symbol: asset.symbol,
      timeframe,
    },
    limit,
  });
};

export const getAssetPrice = async (symbol: string) => {
  return binanceHttpClient.fetchAssetPrice(symbol);
};
