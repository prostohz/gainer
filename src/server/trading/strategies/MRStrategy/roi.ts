import { OPEN_POSITION_COMMISSION_RATE } from '../../../configs/trading';
import { TPositionDirection } from './strategy';

const USDT_QUOTE = 'USDT';

const convertToUsdt = (
  value: number,
  quote: string,
  assetPrices: Record<string, number>,
): number => {
  if (quote === USDT_QUOTE) {
    return value;
  }

  const directPrice = assetPrices[`${quote}${USDT_QUOTE}`];
  if (directPrice) {
    return value * directPrice;
  }

  const reversePrice = assetPrices[`${USDT_QUOTE}${quote}`];
  if (reversePrice) {
    return value * reversePrice;
  }

  throw new Error(`Price for ${quote} not found`);
};

export const calculateRoi = (
  {
    direction,
    assetA,
    assetB,
    quantityA,
    quantityB,
    openPriceA,
    openPriceB,
    closePriceA,
    closePriceB,
  }: {
    direction: TPositionDirection;
    assetA: {
      baseAsset: string;
      quoteAsset: string;
    };
    assetB: {
      baseAsset: string;
      quoteAsset: string;
    };
    quantityA: number;
    quantityB: number;
    openPriceA: number;
    openPriceB: number;
    closePriceA: number;
    closePriceB: number;
  },
  assetPrices: Record<string, number>,
) => {
  // Доходность по каждой из legs
  const pnlA =
    direction === 'buy-sell'
      ? (closePriceA - openPriceA) * quantityA
      : (openPriceA - closePriceA) * quantityA;

  const pnlB =
    direction === 'buy-sell'
      ? (openPriceB - closePriceB) * quantityB
      : (closePriceB - openPriceB) * quantityB;

  // Получаем котируемые валюты
  const quoteA = assetA.quoteAsset;
  const quoteB = assetB.quoteAsset;

  // Переводим PnL и обороты в USDT
  const pnlAUsdt = convertToUsdt(pnlA, quoteA, assetPrices);
  const pnlBUsdt = convertToUsdt(pnlB, quoteB, assetPrices);

  // Оборот при открытии и закрытии позиции (в USDT)
  const turnoverOpenUsdt =
    Math.abs(convertToUsdt(quantityA * openPriceA, quoteA, assetPrices)) +
    Math.abs(convertToUsdt(quantityB * openPriceB, quoteB, assetPrices));

  const turnoverCloseUsdt =
    Math.abs(convertToUsdt(quantityA * closePriceA, quoteA, assetPrices)) +
    Math.abs(convertToUsdt(quantityB * closePriceB, quoteB, assetPrices));

  // Комиссия биржи (опен + клоуз)
  const commission = (turnoverOpenUsdt + turnoverCloseUsdt) * OPEN_POSITION_COMMISSION_RATE;

  const netPnlUsdt = pnlAUsdt + pnlBUsdt - commission;

  // Доходность считаем относительно залоченного капитала при открытии (в USDT)
  const roi = (netPnlUsdt / turnoverOpenUsdt) * 100;

  return roi;
};
