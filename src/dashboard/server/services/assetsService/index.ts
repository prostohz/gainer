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
    const assets = await binanceHttpClient.fetchTradableAssets();

    // Сохраняем данные в кеш
    const cacheData = {
      timestamp: Date.now(),
      assets,
    };

    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2));

    return assets;
  } catch (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }
};
