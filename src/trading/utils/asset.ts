import { TExchangeInfoSymbol, TFilter } from '../providers/Binance/BinanceHTTPClient';

export const getPricePrecision = (asset: TExchangeInfoSymbol): number => {
  const priceFilter = asset.filters.find((filter: TFilter) => filter.filterType === 'PRICE_FILTER');
  if (priceFilter) {
    const tickSize = priceFilter.tickSize;

    if (tickSize && tickSize.includes('.')) {
      return tickSize.split('.')[1].replace(/0+$/, '').length;
    }
  }

  return asset.baseAssetPrecision;
};

export const getVolumePrecision = (asset: TExchangeInfoSymbol): number => {
  const lotSize = asset.filters.find((filter: TFilter) => filter.filterType === 'LOT_SIZE');
  if (lotSize) {
    const stepSize = lotSize.stepSize;
    return stepSize.split('.')[1].replace(/0+$/, '').length;
  }

  return 0;
};
