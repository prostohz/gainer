import BinanceHTTPClient from '../../../../trading/providers/Binance/BinanceHTTPClient';
import { TTimeframe } from '../../../../trading/types';
import { AssetRepository } from '../../repositories/AssetRepository';
import { CandleRepository } from '../../repositories/CandleRepository';

const assetRepository = AssetRepository.getInstance();
const candleRepository = CandleRepository.getInstance();

const binanceHttpClient = BinanceHTTPClient.getInstance();

export const getAssetList = () => {
  return assetRepository.getAssets();
};

export const getAssetCandles = async (
  symbol: string,
  timeframe: TTimeframe,
  limit: number = 1000,
) => {
  const asset = assetRepository.getAsset(symbol);
  if (!asset) {
    throw new Error(`Asset ${symbol} not found`);
  }

  return candleRepository.getCandles(symbol, timeframe, limit);
};

export const getAssetPrice = async (symbol: string) => {
  return binanceHttpClient.fetchAssetPrice(symbol);
};
