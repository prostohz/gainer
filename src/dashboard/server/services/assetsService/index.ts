import fs from 'fs';
import path from 'path';

import BinanceHTTPClient from '../../../../trading/providers/Binance/BinanceHTTPClient';

const CACHE_FILE_PATH = path.resolve(__dirname, '../../../../../data/assets.json');
const CACHE_TTL = 60 * 60 * 1000; // 1 час в миллисекундах

export const getAssets = async () => {
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

    // Если кеша нет или он устарел, получаем новые данные
    const binanceHttpClient = BinanceHTTPClient.getInstance();
    const assets = await binanceHttpClient.fetchAssetsTradable();
    const assets24HrStats = await binanceHttpClient.getAssets24HrStats();

    const assetsWithStats = assets.map((asset) => {
      const assetStats = assets24HrStats.find((stats) => stats.symbol === asset.symbol);
      if (!assetStats) {
        return asset;
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
        usdtVolume,
      };
    });

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
