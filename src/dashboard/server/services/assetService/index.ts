import fs from 'fs';
import path from 'path';

import BinanceHTTPClient from '../../../../trading/providers/Binance/BinanceHTTPClient';
import { getPricePrecision } from '../../../../trading/utils/asset';
import { TKline, TTimeframe } from '../../../../trading/types';
import { TAsset } from './types';

const CACHE_FILE_PATH = path.resolve(__dirname, '../../../../../data/assets.json');
const CACHE_TTL = 60 * 60 * 1000;

const binanceHttpClient = BinanceHTTPClient.getInstance();

export const getAssetList = async () => {
  try {
    // Проверяем наличие и актуальность кеша
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf-8'));
      const currentTime = Date.now();

      // Если кеш актуален (меньше часа), возвращаем данные из кеша
      if (currentTime - cacheData.timestamp < CACHE_TTL) {
        return cacheData.assets;
      }
    }

    const assets = await binanceHttpClient.fetchAssetsTradable();
    const assets24HrStats = await binanceHttpClient.getAssets24HrStats();

    const assetsWithStats = assets.map((asset) => {
      const precision = getPricePrecision(asset);

      const assetStats = assets24HrStats.find((stats) => stats.symbol === asset.symbol);
      if (!assetStats) {
        return {
          precision,
          ...asset,
        };
      }

      const usdtVolume = (() => {
        if (asset.baseAsset === 'USDT') {
          return Number(assetStats.quoteVolume);
        }

        const baseToUsdtAsset = assets24HrStats.find(
          (stats) => stats.symbol === `${asset.baseAsset}USDT`,
        );

        if (!baseToUsdtAsset) {
          return 0;
        }

        return Number(baseToUsdtAsset.lastPrice) * Number(assetStats.volume);
      })();

      return {
        ...asset,
        ...assetStats,
        precision,
        usdtVolume,
      };
    }) as TAsset[];

    // Сохраняем данные в кеш
    const cacheData = {
      timestamp: Date.now(),
      assets: assetsWithStats,
    };

    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2));

    return assets;
  } catch (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }
};

const klinesCache: Record<string, TKline[]> = {};

export const fetchCachedHistoricalKlines = async (
  symbol: string,
  timeframe: TTimeframe,
  limit: number,
): Promise<TKline[]> => {
  const cacheKey = `${symbol}_${timeframe}_${limit}`;

  if (klinesCache[cacheKey]) {
    return klinesCache[cacheKey];
  }

  const klines = await binanceHttpClient.fetchHistoricalKlines(symbol, timeframe, limit);
  klinesCache[cacheKey] = klines;

  return klines;
};

export const getAssetKlines = async (
  symbol: string,
  timeframe: TTimeframe,
  limit: number = 1000,
  cache: boolean = true,
) => {
  const assets = await getAssetList();
  const asset = assets.find((item: TAsset) => item.symbol === symbol);

  if (!asset) {
    throw new Error(`Asset ${symbol} not found`);
  }

  if (cache) {
    return fetchCachedHistoricalKlines(asset.symbol, timeframe, limit);
  }

  return binanceHttpClient.fetchHistoricalKlines(asset.symbol, timeframe, limit);
};

export const getAssetPrice = async (symbol: string) => {
  return binanceHttpClient.fetchAssetPrice(symbol);
};
