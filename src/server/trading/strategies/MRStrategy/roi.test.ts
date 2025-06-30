import { calculateRoi } from './roi';

describe('calculateRoi', () => {
  const mockAssetPrices = {
    BTCUSDT: 50000,
    ETHUSDT: 3000,
    ADAUSDT: 0.5,
    USDTBTC: 1 / 50000, // Обратный курс для BTC
    USDTETH: 1 / 3000, // Обратный курс для ETH
  };

  const baseTradeParams = {
    assetA: {
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
    },
    assetB: {
      baseAsset: 'ETH',
      quoteAsset: 'USDT',
    },
    quantityA: 0.1, // 0.1 BTC
    quantityB: 1.0, // 1.0 ETH
  };

  describe('направление buy-sell', () => {
    it('должен корректно рассчитывать ROI при прибыльной сделке', () => {
      const params = {
        direction: 'buy-sell' as const,
        ...baseTradeParams,
        openPriceA: 49000, // Покупаем BTC дешево
        openPriceB: 3100, // Продаем ETH дорого
        closePriceA: 51000, // Продаем BTC дорого
        closePriceB: 2900, // Покупаем ETH дешево
      };

      const roi = calculateRoi(params, mockAssetPrices);

      // PnL Asset A: (51000 - 49000) * 0.1 = 200 USDT
      // PnL Asset B: (3100 - 2900) * 1.0 = 200 USDT
      // Общий PnL: 400 USDT
      // Оборот при открытии: |49000 * 0.1| + |3100 * 1.0| = 4900 + 3100 = 8000 USDT
      // Оборот при закрытии: |51000 * 0.1| + |2900 * 1.0| = 5100 + 2900 = 8000 USDT
      // Комиссия: (8000 + 8000) * 0.001 = 16 USDT
      // Чистый PnL: 400 - 16 = 384 USDT
      // ROI: (384 / 8000) * 100 = 4.8%

      expect(roi).toBeCloseTo(4.8, 2);
    });

    it('должен корректно рассчитывать ROI при убыточной сделке', () => {
      const params = {
        direction: 'buy-sell' as const,
        ...baseTradeParams,
        openPriceA: 51000, // Покупаем BTC дорого
        openPriceB: 2900, // Продаем ETH дешево
        closePriceA: 49000, // Продаем BTC дешево
        closePriceB: 3100, // Покупаем ETH дорого
      };

      const roi = calculateRoi(params, mockAssetPrices);

      // PnL Asset A: (49000 - 51000) * 0.1 = -200 USDT
      // PnL Asset B: (2900 - 3100) * 1.0 = -200 USDT
      // Общий PnL: -400 USDT
      // Оборот при открытии: |51000 * 0.1| + |2900 * 1.0| = 5100 + 2900 = 8000 USDT
      // Оборот при закрытии: |49000 * 0.1| + |3100 * 1.0| = 4900 + 3100 = 8000 USDT
      // Комиссия: (8000 + 8000) * 0.001 = 16 USDT
      // Чистый PnL: -400 - 16 = -416 USDT
      // ROI: (-416 / 8000) * 100 = -5.2%

      expect(roi).toBeCloseTo(-5.2, 2);
    });
  });

  describe('направление sell-buy', () => {
    it('должен корректно рассчитывать ROI при прибыльной сделке', () => {
      const params = {
        direction: 'sell-buy' as const,
        ...baseTradeParams,
        openPriceA: 51000, // Продаем BTC дорого
        openPriceB: 2900, // Покупаем ETH дешево
        closePriceA: 49000, // Покупаем BTC дешево
        closePriceB: 3100, // Продаем ETH дорого
      };

      const roi = calculateRoi(params, mockAssetPrices);

      // PnL Asset A: (51000 - 49000) * 0.1 = 200 USDT
      // PnL Asset B: (3100 - 2900) * 1.0 = 200 USDT
      // Общий PnL: 400 USDT
      // Оборот при открытии: |51000 * 0.1| + |2900 * 1.0| = 5100 + 2900 = 8000 USDT
      // Оборот при закрытии: |49000 * 0.1| + |3100 * 1.0| = 4900 + 3100 = 8000 USDT
      // Комиссия: (8000 + 8000) * 0.001 = 16 USDT
      // Чистый PnL: 400 - 16 = 384 USDT
      // ROI: (384 / 8000) * 100 = 4.8%

      expect(roi).toBeCloseTo(4.8, 2);
    });
  });

  describe('разные котируемые валюты', () => {
    it('должен корректно конвертировать BTC котируемую валюту в USDT', () => {
      const params = {
        direction: 'buy-sell' as const,
        assetA: {
          baseAsset: 'ETH',
          quoteAsset: 'BTC',
        },
        assetB: {
          baseAsset: 'ADA',
          quoteAsset: 'USDT',
        },
        quantityA: 1.0, // 1.0 ETH
        quantityB: 1000, // 1000 ADA
        openPriceA: 0.06, // 0.06 BTC за ETH
        openPriceB: 0.52, // 0.52 USDT за ADA
        closePriceA: 0.062, // 0.062 BTC за ETH
        closePriceB: 0.48, // 0.48 USDT за ADA
      };

      const assetPricesWithBtc = {
        ...mockAssetPrices,
        BTCUSDT: 50000,
      };

      const roi = calculateRoi(params, assetPricesWithBtc);

      // PnL Asset A: (0.062 - 0.06) * 1.0 = 0.002 BTC = 0.002 * 50000 = 100 USDT
      // PnL Asset B: (0.52 - 0.48) * 1000 = 40 USDT
      // Общий PnL: 140 USDT
      // Оборот при открытии: |0.06 * 1.0 * 50000| + |0.52 * 1000| = 3000 + 520 = 3520 USDT
      // Оборот при закрытии: |0.062 * 1.0 * 50000| + |0.48 * 1000| = 3100 + 480 = 3580 USDT
      // Комиссия: (3520 + 3580) * 0.001 = 7.1 USDT
      // Чистый PnL: 140 - 7.1 = 132.9 USDT
      // ROI: (132.9 / 3520) * 100 ≈ 3.78%

      expect(roi).toBeCloseTo(3.78, 2);
    });

    it('должен использовать обратный курс когда прямой недоступен', () => {
      const params = {
        direction: 'buy-sell' as const,
        assetA: {
          baseAsset: 'ADA',
          quoteAsset: 'BTC',
        },
        assetB: {
          baseAsset: 'ETH',
          quoteAsset: 'USDT',
        },
        quantityA: 1000, // 1000 ADA
        quantityB: 1.0, // 1.0 ETH
        openPriceA: 0.00001, // 0.00001 BTC за ADA
        openPriceB: 3000, // 3000 USDT за ETH
        closePriceA: 0.000012, // 0.000012 BTC за ADA
        closePriceB: 2950, // 2950 USDT за ETH
      };

      const assetPricesReverse = {
        ETHUSDT: 3000,
        USDTBTC: 1 / 50000, // Обратный курс для BTC
      };

      const roi = calculateRoi(params, assetPricesReverse);

      // PnL Asset A: (0.000012 - 0.00001) * 1000 = 0.002 BTC = 0.002 * 50000 = 100 USDT
      // PnL Asset B: (3000 - 2950) * 1.0 = 50 USDT
      // Общий PnL: 150 USDT

      expect(roi).toBeGreaterThan(0);
    });

    it('должен выбрасывать ошибку если курс валюты не найден', () => {
      const params = {
        direction: 'buy-sell' as const,
        assetA: {
          baseAsset: 'BTC',
          quoteAsset: 'EUR', // EUR не в списке цен
        },
        assetB: {
          baseAsset: 'ETH',
          quoteAsset: 'USDT',
        },
        quantityA: 0.1,
        quantityB: 1.0,
        openPriceA: 45000,
        openPriceB: 3000,
        closePriceA: 46000,
        closePriceB: 2950,
      };

      expect(() => calculateRoi(params, mockAssetPrices)).toThrow('Price for EUR not found');
    });
  });

  describe('граничные случаи', () => {
    it('должен корректно обрабатывать нулевые PnL', () => {
      const params = {
        direction: 'buy-sell' as const,
        ...baseTradeParams,
        openPriceA: 50000,
        openPriceB: 3000,
        closePriceA: 50000, // Та же цена
        closePriceB: 3000, // Та же цена
      };

      const roi = calculateRoi(params, mockAssetPrices);

      // PnL Asset A: 0 USDT
      // PnL Asset B: 0 USDT
      // Общий PnL: 0 USDT
      // Оборот: |50000 * 0.1| + |3000 * 1.0| = 8000 USDT (открытие и закрытие)
      // Комиссия: (8000 + 8000) * 0.001 = 16 USDT
      // Чистый PnL: 0 - 16 = -16 USDT
      // ROI: (-16 / 8000) * 100 = -0.2%

      expect(roi).toBeCloseTo(-0.2, 2);
    });

    it('должен корректно обрабатывать очень маленькие количества', () => {
      const params = {
        direction: 'buy-sell' as const,
        assetA: {
          baseAsset: 'BTC',
          quoteAsset: 'USDT',
        },
        assetB: {
          baseAsset: 'ETH',
          quoteAsset: 'USDT',
        },
        quantityA: 0.001, // Очень маленькое количество
        quantityB: 0.01, // Очень маленькое количество
        openPriceA: 50000,
        openPriceB: 3000,
        closePriceA: 51000,
        closePriceB: 2900,
      };

      const roi = calculateRoi(params, mockAssetPrices);

      // Должен корректно рассчитывать даже для маленьких сумм
      expect(typeof roi).toBe('number');
      expect(roi).not.toBeNaN();
    });

    it('должен корректно обрабатывать одинаковые котируемые валюты USDT', () => {
      const params = {
        direction: 'buy-sell' as const,
        assetA: {
          baseAsset: 'BTC',
          quoteAsset: 'USDT',
        },
        assetB: {
          baseAsset: 'ETH',
          quoteAsset: 'USDT',
        },
        quantityA: 0.1,
        quantityB: 1.0,
        openPriceA: 50000,
        openPriceB: 3000,
        closePriceA: 50500,
        closePriceB: 2950,
      };

      const roi = calculateRoi(params, mockAssetPrices);

      // PnL Asset A: (50500 - 50000) * 0.1 = 50 USDT
      // PnL Asset B: (3000 - 2950) * 1.0 = 50 USDT
      // Общий PnL: 100 USDT
      // Оборот при открытии: |50000 * 0.1| + |3000 * 1.0| = 5000 + 3000 = 8000 USDT
      // Оборот при закрытии: |50500 * 0.1| + |2950 * 1.0| = 5050 + 2950 = 8000 USDT
      // Комиссия: (8000 + 8000) * 0.001 = 16 USDT
      // Чистый PnL: 100 - 16 = 84 USDT
      // ROI: (84 / 8000) * 100 = 1.05%

      expect(roi).toBeCloseTo(1.05, 2);
    });
  });

  describe('валидация комиссии', () => {
    it('должен использовать правильную ставку комиссии', () => {
      const params = {
        direction: 'buy-sell' as const,
        ...baseTradeParams,
        openPriceA: 50000,
        openPriceB: 3000,
        closePriceA: 50000,
        closePriceB: 3000,
      };

      const roi = calculateRoi(params, mockAssetPrices);

      // При нулевом PnL, ROI должен быть отрицательным из-за комиссии
      // Комиссия должна быть 0.1% от общего оборота
      const expectedCommission = 16; // (8000 + 8000) * 0.001
      const expectedRoi = (-expectedCommission / 8000) * 100;

      expect(roi).toBeCloseTo(expectedRoi, 2);
    });
  });
});
