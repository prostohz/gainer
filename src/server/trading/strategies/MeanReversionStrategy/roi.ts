import { OPEN_POSITION_COMMISSION_RATE } from '../../../configs/trading';
import { TPositionDirection } from './strategy';

// Список основных стейблкоинов и их коэффициент к USDT (предполагаем паритет 1:1)
const STABLE_TO_USDT_RATE: Record<string, number> = {
  USDT: 1,
  USDC: 1,
  BUSD: 1,
  TUSD: 1,
  FDUSD: 1,
};

// Выделяем котируемую валюту из символа Binance (например, BTCUSDT → USDT)
const getQuoteCurrency = (symbol: string): string => {
  const quotes = Object.keys(STABLE_TO_USDT_RATE).sort((a, b) => b.length - a.length); // длинные суффиксы сначала
  for (const q of quotes) {
    if (symbol.endsWith(q)) return q;
  }
  return 'USDT'; // по умолчанию считаем USDT
};

// Конвертация стоимости из котируемой валюты в USDT
const convertToUsdt = (value: number, quote: string): number => {
  const rate = STABLE_TO_USDT_RATE[quote];
  return value * (rate ?? 1);
};

export const calculateRoi = (
  direction: TPositionDirection,
  symbolA: string,
  symbolB: string,
  quantityA: number,
  quantityB: number,
  openPriceA: number,
  openPriceB: number,
  closePriceA: number,
  closePriceB: number,
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
  const quoteA = getQuoteCurrency(symbolA);
  const quoteB = getQuoteCurrency(symbolB);

  // Переводим PnL и обороты в USDT
  const pnlAUsdt = convertToUsdt(pnlA, quoteA);
  const pnlBUsdt = convertToUsdt(pnlB, quoteB);

  // Оборот при открытии и закрытии позиции (в USDT)
  const turnoverOpenUsdt =
    Math.abs(convertToUsdt(quantityA * openPriceA, quoteA)) +
    Math.abs(convertToUsdt(quantityB * openPriceB, quoteB));

  const turnoverCloseUsdt =
    Math.abs(convertToUsdt(quantityA * closePriceA, quoteA)) +
    Math.abs(convertToUsdt(quantityB * closePriceB, quoteB));

  // Комиссия биржи (опен + клоуз)
  const commission = (turnoverOpenUsdt + turnoverCloseUsdt) * OPEN_POSITION_COMMISSION_RATE;

  const netPnlUsdt = pnlAUsdt + pnlBUsdt - commission;

  // Доходность считаем относительно залоченного капитала при открытии (в USDT)
  const roi = (netPnlUsdt / turnoverOpenUsdt) * 100;

  return roi;
};
