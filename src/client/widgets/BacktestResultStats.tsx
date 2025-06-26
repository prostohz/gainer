import cn from 'classnames';

import { TCompleteTrade } from '../../server/trading/strategies/MeanReversionStrategy/backtest';

export const BacktestResultStats = ({ results }: { results: TCompleteTrade[] }) => {
  const totalTrades = results.length;
  const profitableTrades = results.filter((trade) => trade.roi > 0).length;
  const unprofitableTrades = totalTrades - profitableTrades;
  const totalProfit = results.reduce((sum, trade) => sum + trade.roi, 0);
  const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
  const maxProfit = Math.max(...results.map((trade) => trade.roi), 0);
  const maxLoss = Math.min(...results.map((trade) => trade.roi), 0);

  // Дополнительные статистики
  const profitableRois = results.filter((trade) => trade.roi > 0).map((trade) => trade.roi);
  const unprofitableRois = results.filter((trade) => trade.roi <= 0).map((trade) => trade.roi);

  const avgProfitableRoi =
    profitableRois.length > 0
      ? profitableRois.reduce((sum, roi) => sum + roi, 0) / profitableRois.length
      : 0;
  const avgUnprofitableRoi =
    unprofitableRois.length > 0
      ? unprofitableRois.reduce((sum, roi) => sum + roi, 0) / unprofitableRois.length
      : 0;

  // Коэффициент прибыли (Profit Factor)
  const totalProfitValue = profitableRois.reduce((sum, roi) => sum + roi, 0);
  const totalLossValue = Math.abs(unprofitableRois.reduce((sum, roi) => sum + roi, 0));
  const profitFactor =
    totalLossValue > 0 ? totalProfitValue / totalLossValue : totalProfitValue > 0 ? Infinity : 0;

  // Медиана ROI
  const sortedRois = [...results.map((trade) => trade.roi)].sort((a, b) => a - b);
  const medianRoi =
    sortedRois.length > 0
      ? sortedRois.length % 2 === 0
        ? (sortedRois[sortedRois.length / 2 - 1] + sortedRois[sortedRois.length / 2]) / 2
        : sortedRois[Math.floor(sortedRois.length / 2)]
      : 0;

  // Стандартное отклонение ROI
  const variance =
    totalTrades > 0
      ? results.reduce((sum, trade) => sum + Math.pow(trade.roi - avgProfit, 2), 0) / totalTrades
      : 0;
  const stdDevRoi = Math.sqrt(variance);

  // Коэффициент Шарпа (упрощенный, без учета безрисковой ставки)
  const sharpeRatio = stdDevRoi > 0 ? avgProfit / stdDevRoi : 0;

  // Максимальная просадка
  let peak = 0;
  let maxDrawdown = 0;
  let cumulativeRoi = 0;

  for (const trade of results) {
    cumulativeRoi += trade.roi;
    if (cumulativeRoi > peak) {
      peak = cumulativeRoi;
    }
    const drawdown = peak - cumulativeRoi;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Коэффициент восстановления
  const recoveryFactor =
    maxDrawdown > 0 ? totalProfit / maxDrawdown : totalProfit > 0 ? Infinity : 0;

  // Среднее время удержания позиции (в часах)
  const avgHoldingTime =
    totalTrades > 0
      ? results.reduce((sum, trade) => sum + (trade.closeTime - trade.openTime), 0) /
        totalTrades /
        (1000 * 60 * 60)
      : 0;

  return (
    <div className="space-y-4">
      {/* Основные показатели */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-base-content/80">📊 Основные показатели</h3>
        <div className="grid grid-cols-6 gap-2">
          <div className="stat bg-base-100 rounded-md p-2 border-l-2 border-primary">
            <div className="stat-title text-xs font-medium flex items-center gap-1">
              Общая прибыль
              <div
                className="tooltip tooltip-top"
                data-tip="Суммарная доходность всех сделок. Показывает общий результат стратегии."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div
              className={cn('stat-value text-lg font-bold', {
                'text-success': totalProfit >= 0,
                'text-error': totalProfit < 0,
              })}
            >
              {totalProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Всего сделок
              <div
                className="tooltip tooltip-top"
                data-tip="Общее количество совершенных сделок за период тестирования."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-base">{totalTrades}</div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Процент побед
              <div
                className="tooltip tooltip-top"
                data-tip="Доля прибыльных сделок от общего количества. Высокий процент не всегда означает прибыльность стратегии."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-base">{winRate.toFixed(1)}%</div>
            <div className="stat-desc text-xs opacity-70">
              {profitableTrades} / {unprofitableTrades}
            </div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Средняя прибыль
              <div
                className="tooltip tooltip-top"
                data-tip="Средняя доходность одной сделки. Учитывает как прибыльные, так и убыточные сделки."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div
              className={cn('stat-value text-base', {
                'text-success': avgProfit >= 0,
                'text-error': avgProfit < 0,
              })}
            >
              {avgProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs font-medium flex items-center gap-1">
              Средняя прибыльная сделка
              <div
                className="tooltip tooltip-top"
                data-tip="Средняя доходность только среди прибыльных сделок. Показывает силу положительных сигналов стратегии."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-base text-success font-bold">
              {avgProfitableRoi.toFixed(2)}%
            </div>
            <div className="stat-desc text-xs opacity-70">из {profitableTrades} сделок</div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs font-medium flex items-center gap-1">
              Средняя убыточная сделка
              <div
                className="tooltip tooltip-top"
                data-tip="Средний убыток только среди убыточных сделок. Показывает размер потерь при неудачных сигналах."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-base text-error font-bold">
              {avgUnprofitableRoi.toFixed(2)}%
            </div>
            <div className="stat-desc text-xs opacity-70">из {unprofitableTrades} сделок</div>
          </div>
        </div>
      </div>

      {/* Анализ рисков */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-base-content/80">⚠️ Анализ рисков</h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="stat bg-base-100 rounded-md p-2 border-l-2 border-error">
            <div className="stat-title text-xs font-medium flex items-center gap-1">
              Макс. просадка
              <div
                className="tooltip tooltip-top"
                data-tip="Максимальное снижение капитала от пика до дна. Показывает худший сценарий убытков. Чем меньше, тем лучше."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-base text-error font-bold">
              {maxDrawdown.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Коэф. Шарпа
              <div
                className="tooltip tooltip-top"
                data-tip="Отношение доходности к волатильности. >1 отлично, 0.5-1 хорошо, <0.5 плохо. Показывает эффективность с учетом риска."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div
              className={cn('stat-value text-base', {
                'text-success': sharpeRatio >= 1,
                'text-warning': sharpeRatio >= 0.5 && sharpeRatio < 1,
                'text-error': sharpeRatio < 0.5,
              })}
            >
              {sharpeRatio.toFixed(2)}
            </div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Волатильность
              <div
                className="tooltip tooltip-top"
                data-tip="Стандартное отклонение доходности. Показывает, насколько результаты сделок отклоняются от среднего. Выше = рискованнее."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-base">{stdDevRoi.toFixed(2)}%</div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Коэф. восстановления
              <div
                className="tooltip tooltip-top"
                data-tip="Отношение общей прибыли к максимальной просадке. Показывает способность стратегии восстанавливаться после убытков."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-base">
              {recoveryFactor === Infinity ? '∞' : recoveryFactor.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Детальная статистика */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-base-content/80">🔍 Детальная статистика</h3>
        <div className="grid grid-cols-5 gap-2">
          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Profit Factor
              <div
                className="tooltip tooltip-top"
                data-tip="Отношение суммы прибыльных сделок к сумме убыточных. >1.5 отлично, 1-1.5 хорошо, <1 убыточная стратегия."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div
              className={cn('stat-value text-sm font-semibold', {
                'text-success': profitFactor >= 1.5,
                'text-warning': profitFactor >= 1 && profitFactor < 1.5,
                'text-error': profitFactor < 1,
              })}
            >
              {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
            </div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Медиана ROI
              <div
                className="tooltip tooltip-top"
                data-tip="Средняя сделка по доходности. В отличие от среднего арифметического, медиана не искажается экстремальными значениями."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div
              className={cn('stat-value text-sm font-semibold', {
                'text-success': medianRoi >= 0,
                'text-error': medianRoi < 0,
              })}
            >
              {medianRoi.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Макс. прибыль
              <div
                className="tooltip tooltip-top"
                data-tip="Наибольшая прибыль от одной сделки. Показывает потенциал стратегии в лучшем случае."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-sm font-semibold text-success">
              {maxProfit.toFixed(2)}%
            </div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Макс. убыток
              <div
                className="tooltip tooltip-top"
                data-tip="Наибольший убыток от одной сделки. Показывает максимальный риск на одну позицию."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-sm font-semibold text-error">{maxLoss.toFixed(2)}%</div>
          </div>

          <div className="stat bg-base-100 rounded-md p-2">
            <div className="stat-title text-xs flex items-center gap-1">
              Время удержания
              <div
                className="tooltip tooltip-top"
                data-tip="Среднее время между открытием и закрытием позиции. Влияет на оборачиваемость капитала и экспозицию к риску."
              >
                <span className="text-xs cursor-help">ℹ️</span>
              </div>
            </div>
            <div className="stat-value text-sm font-semibold">{avgHoldingTime.toFixed(1)}ч</div>
          </div>
        </div>
      </div>
    </div>
  );
};
