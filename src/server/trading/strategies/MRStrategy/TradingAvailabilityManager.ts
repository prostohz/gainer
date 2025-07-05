import { backtestLogger as logger } from '../../../utils/logger';
import { dayjs } from '../../../../shared/utils/daytime';

type TTradeRecord = {
  timestamp: number;
  roi: number;
};

type TPairTradingState = {
  isAvailable: boolean;
  trades: TTradeRecord[];
  blockUntil?: number;
  blockReason?: string;
};

export class TradingAvailabilityManager {
  private pairStates = new Map<string, TPairTradingState>();

  constructor(private currentTimeProvider: () => number) {}

  initializePair(pairSymbol: string): void {
    this.pairStates.set(pairSymbol, {
      isAvailable: true,
      trades: [],
    });
  }

  isPairAvailable(pairSymbol: string): boolean {
    const state = this.pairStates.get(pairSymbol);
    if (!state) return false;

    const currentTime = this.currentTimeProvider();

    // Проверяем, не заблокирована ли пара по времени
    if (state.blockUntil && currentTime < state.blockUntil) {
      return false;
    }

    // Если время блокировки истекло, разблокируем пару
    if (state.blockUntil && currentTime >= state.blockUntil) {
      state.isAvailable = true;
      state.blockUntil = undefined;
      state.blockReason = undefined;
    }

    return state.isAvailable;
  }

  recordTrade(pairSymbol: string, roi: number): void {
    const currentTime = this.currentTimeProvider();
    const state = this.pairStates.get(pairSymbol);
    if (!state) return;

    // Записываем сделку
    state.trades.push({
      timestamp: currentTime,
      roi,
    });

    // Убираем сделки старше часа для расчета суммарного убытка
    const hourAgo = currentTime - 60 * 60 * 1000; // 60 минут в миллисекундах
    state.trades = state.trades.filter((trade) => trade.timestamp > hourAgo);

    // Проверяем условия блокировки
    this.checkBlockingConditions(pairSymbol, roi);
  }

  private checkBlockingConditions(pairSymbol: string, roi: number): void {
    const state = this.pairStates.get(pairSymbol);
    if (!state) return;

    const currentTime = this.currentTimeProvider();

    // Условие 1: Убыток больше 1% за одну сделку
    if (roi < -1.0) {
      this.blockPair(pairSymbol, `Убыток ${roi.toFixed(2)}% за одну сделку превысил лимит 1%`);
      return;
    }

    // Условие 2: Суммарный убыток больше 0.5% за час
    const hourAgo = currentTime - 60 * 60 * 1000;
    const recentTrades = state.trades.filter((trade) => trade.timestamp > hourAgo);
    const totalRoi = recentTrades.reduce((sum, trade) => sum + trade.roi, 0);

    if (totalRoi < -0.5) {
      this.blockPair(
        pairSymbol,
        `Суммарный убыток ${totalRoi.toFixed(2)}% за час превысил лимит 0.5%`,
      );
      return;
    }

    // Условие 3: Три подряд убыточные сделки
    if (state.trades.length >= 3) {
      const lastThreeTrades = state.trades.slice(-3);
      const allLosing = lastThreeTrades.every((trade) => trade.roi < 0);

      if (allLosing) {
        const roiValues = lastThreeTrades.map((trade) => trade.roi.toFixed(2)).join('%, ');
        this.blockPair(pairSymbol, `Три подряд убыточные сделки: ${roiValues}%`);
        return;
      }
    }
  }

  private blockPair(pairSymbol: string, reason: string): void {
    const state = this.pairStates.get(pairSymbol);
    if (!state) return;

    const currentTime = this.currentTimeProvider();

    state.isAvailable = false;
    state.blockUntil = currentTime + 60 * 60 * 1000; // Блокируем на час
    state.blockReason = reason;

    logger.warn(
      `Пара ${pairSymbol} заблокирована: ${reason}. Разблокировка в ${dayjs(state.blockUntil).format('HH:mm:ss')}`,
    );
  }

  forceBlockPair(pairSymbol: string, reason: string = 'Stop-loss'): void {
    this.blockPair(pairSymbol, reason);
  }

  getPairState(pairSymbol: string): TPairTradingState | undefined {
    return this.pairStates.get(pairSymbol);
  }
}
