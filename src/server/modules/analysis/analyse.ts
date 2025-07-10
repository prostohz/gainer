import * as fs from 'fs';
import * as path from 'path';
import { create, all } from 'mathjs';

const math = create(all);

// Типы данных для анализа
type TPositionDirection = 'buy-sell' | 'sell-buy';

type TCompleteTrade = {
  id: number;
  direction: TPositionDirection;
  symbolA: string;
  symbolB: string;
  quantityA: number;
  quantityB: number;
  openPriceA: number;
  closePriceA: number;
  openPriceB: number;
  closePriceB: number;
  openTime: number;
  closeTime: number;
  roi: number;
  openReason: string;
  closeReason: string;
};

type TMRReport = {
  id: number;
  date: number;
  tagId: number;
  pairsCount?: number;
  lastBacktestAt: Date | null;
  backtestTrades: TCompleteTrade[];
};

// Интерфейс для результатов анализа
export interface AnalysisResult {
  totalReports: number;
  reportsWithTrades: number;
  totalTrades: number;
  profitabilityStats: {
    totalProfit: number;
    averageRoi: number;
    medianRoi: number;
    winRate: number;
    maxProfit: number;
    maxLoss: number;
    sharpeRatio: number;
  };
  timeAnalysis: {
    averageHoldingTime: number;
    medianHoldingTime: number;
    shortestTrade: number;
    longestTrade: number;
    hourlyAnalysis: Record<
      number,
      {
        totalTrades: number;
        averageRoi: number;
        winRate: number;
      }
    >;
    dailyAnalysis: Record<
      string,
      {
        totalTrades: number;
        averageRoi: number;
        winRate: number;
      }
    >;
  };
  pairAnalysis: {
    mostProfitablePairs: Array<{
      pairName: string;
      totalTrades: number;
      totalProfit: number;
      averageRoi: number;
      winRate: number;
    }>;
    leastProfitablePairs: Array<{
      pairName: string;
      totalTrades: number;
      totalProfit: number;
      averageRoi: number;
      winRate: number;
    }>;
    symbolAnalysis: {
      mostProfitableSymbols: Array<{
        symbol: string;
        totalTrades: number;
        totalProfit: number;
        averageRoi: number;
        winRate: number;
      }>;
      leastProfitableSymbols: Array<{
        symbol: string;
        totalTrades: number;
        totalProfit: number;
        averageRoi: number;
        winRate: number;
      }>;
    };
  };
  reasonAnalysis: {
    openReasons: Record<
      string,
      {
        count: number;
        averageRoi: number;
        winRate: number;
      }
    >;
    closeReasons: Record<
      string,
      {
        count: number;
        averageRoi: number;
        winRate: number;
      }
    >;
  };
  riskAnalysis: {
    maxDrawdown: number;
    consecutiveLosses: number;
    volatility: number;
    profitFactor: number;
    largestWin: number;
    largestLoss: number;
  };
  recommendations: string[];
}

// Функция для загрузки данных
function loadData(fileName: string = 'noHurst.json'): TMRReport[] {
  const dataPath = path.join(__dirname, 'reports', fileName);
  const rawData = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(rawData);
}

// Функция для получения всех сделок
function getAllTrades(reports: TMRReport[]): TCompleteTrade[] {
  return reports.flatMap((report) => report.backtestTrades || []);
}

// Функция для создания названия пары
function createPairName(symbolA: string, symbolB: string): string {
  return `${symbolA}/${symbolB}`;
}

// Функция для вычисления статистики прибыльности
function calculateProfitabilityStats(trades: TCompleteTrade[]) {
  const rois = trades.map((trade) => trade.roi);
  const winningTrades = trades.filter((trade) => trade.roi > 0);

  const totalProfit = rois.reduce((sum, roi) => sum + roi, 0);
  const averageRoi = totalProfit / trades.length;
  const medianRoi = Number(math.median(rois));
  const winRate = winningTrades.length / trades.length;
  const maxProfit = Math.max(...rois);
  const maxLoss = Math.min(...rois);

  // Вычисляем коэффициент Шарпа (упрощенная версия)
  const stdDev = Number(math.std(rois));
  const sharpeRatio = stdDev > 0 ? averageRoi / stdDev : 0;

  return {
    totalProfit,
    averageRoi,
    medianRoi,
    winRate,
    maxProfit,
    maxLoss,
    sharpeRatio,
  };
}

// Функция для анализа времени удержания позиций
function analyzeHoldingTime(trades: TCompleteTrade[]) {
  const holdingTimes = trades.map((trade) => trade.closeTime - trade.openTime);

  // Анализ по часам
  const hourlyStats = new Map<number, { trades: TCompleteTrade[]; winningTrades: number }>();

  // Анализ по дням недели
  const dailyStats = new Map<string, { trades: TCompleteTrade[]; winningTrades: number }>();

  trades.forEach((trade) => {
    const openDate = new Date(trade.openTime);
    const hour = openDate.getHours();
    const dayOfWeek = openDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Часовой анализ
    if (!hourlyStats.has(hour)) {
      hourlyStats.set(hour, { trades: [], winningTrades: 0 });
    }
    const hourStats = hourlyStats.get(hour)!;
    hourStats.trades.push(trade);
    if (trade.roi > 0) hourStats.winningTrades++;

    // Дневной анализ
    if (!dailyStats.has(dayOfWeek)) {
      dailyStats.set(dayOfWeek, { trades: [], winningTrades: 0 });
    }
    const dayStats = dailyStats.get(dayOfWeek)!;
    dayStats.trades.push(trade);
    if (trade.roi > 0) dayStats.winningTrades++;
  });

  const hourlyAnalysis: Record<
    number,
    { totalTrades: number; averageRoi: number; winRate: number }
  > = {};
  hourlyStats.forEach((stats, hour) => {
    const totalRoi = stats.trades.reduce((sum, trade) => sum + trade.roi, 0);
    hourlyAnalysis[hour] = {
      totalTrades: stats.trades.length,
      averageRoi: totalRoi / stats.trades.length,
      winRate: stats.winningTrades / stats.trades.length,
    };
  });

  const dailyAnalysis: Record<
    string,
    { totalTrades: number; averageRoi: number; winRate: number }
  > = {};
  dailyStats.forEach((stats, day) => {
    const totalRoi = stats.trades.reduce((sum, trade) => sum + trade.roi, 0);
    dailyAnalysis[day] = {
      totalTrades: stats.trades.length,
      averageRoi: totalRoi / stats.trades.length,
      winRate: stats.winningTrades / stats.trades.length,
    };
  });

  return {
    averageHoldingTime: Number(math.mean(holdingTimes)),
    medianHoldingTime: Number(math.median(holdingTimes)),
    shortestTrade: Math.min(...holdingTimes),
    longestTrade: Math.max(...holdingTimes),
    hourlyAnalysis,
    dailyAnalysis,
  };
}

// Функция для анализа торговых пар
function analyzePairs(trades: TCompleteTrade[]) {
  const pairStats = new Map<
    string,
    {
      trades: TCompleteTrade[];
      totalProfit: number;
      winningTrades: number;
    }
  >();

  const symbolStats = new Map<
    string,
    {
      trades: TCompleteTrade[];
      totalProfit: number;
      winningTrades: number;
    }
  >();

  trades.forEach((trade) => {
    const pairName = createPairName(trade.symbolA, trade.symbolB);

    // Анализ пар
    if (!pairStats.has(pairName)) {
      pairStats.set(pairName, {
        trades: [],
        totalProfit: 0,
        winningTrades: 0,
      });
    }

    const stats = pairStats.get(pairName)!;
    stats.trades.push(trade);
    stats.totalProfit += trade.roi;
    if (trade.roi > 0) stats.winningTrades++;

    // Анализ отдельных символов
    [trade.symbolA, trade.symbolB].forEach((symbol) => {
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          trades: [],
          totalProfit: 0,
          winningTrades: 0,
        });
      }

      const symbolStat = symbolStats.get(symbol)!;
      symbolStat.trades.push(trade);
      symbolStat.totalProfit += trade.roi;
      if (trade.roi > 0) symbolStat.winningTrades++;
    });
  });

  const pairAnalysis = Array.from(pairStats.entries())
    .map(([pairName, stats]) => ({
      pairName,
      totalTrades: stats.trades.length,
      totalProfit: stats.totalProfit,
      averageRoi: stats.totalProfit / stats.trades.length,
      winRate: stats.winningTrades / stats.trades.length,
    }))
    .filter((pair) => pair.totalTrades >= 5);

  const symbolAnalysis = Array.from(symbolStats.entries())
    .map(([symbol, stats]) => ({
      symbol,
      totalTrades: stats.trades.length,
      totalProfit: stats.totalProfit,
      averageRoi: stats.totalProfit / stats.trades.length,
      winRate: stats.winningTrades / stats.trades.length,
    }))
    .filter((symbol) => symbol.totalTrades >= 10);

  const sortedByProfit = [...pairAnalysis].sort((a, b) => b.totalProfit - a.totalProfit);
  const sortedSymbolsByProfit = [...symbolAnalysis].sort((a, b) => b.totalProfit - a.totalProfit);

  return {
    mostProfitablePairs: sortedByProfit.slice(0, 10),
    leastProfitablePairs: sortedByProfit.slice(-10).reverse(),
    symbolAnalysis: {
      mostProfitableSymbols: sortedSymbolsByProfit.slice(0, 10),
      leastProfitableSymbols: sortedSymbolsByProfit.slice(-10).reverse(),
    },
  };
}

// Функция для анализа причин открытия/закрытия позиций
function analyzeReasons(trades: TCompleteTrade[]) {
  const openReasons = new Map<string, { trades: TCompleteTrade[]; winningTrades: number }>();
  const closeReasons = new Map<string, { trades: TCompleteTrade[]; winningTrades: number }>();

  trades.forEach((trade) => {
    // Анализ причин открытия
    if (!openReasons.has(trade.openReason)) {
      openReasons.set(trade.openReason, { trades: [], winningTrades: 0 });
    }
    const openStats = openReasons.get(trade.openReason)!;
    openStats.trades.push(trade);
    if (trade.roi > 0) openStats.winningTrades++;

    // Анализ причин закрытия
    if (!closeReasons.has(trade.closeReason)) {
      closeReasons.set(trade.closeReason, { trades: [], winningTrades: 0 });
    }
    const closeStats = closeReasons.get(trade.closeReason)!;
    closeStats.trades.push(trade);
    if (trade.roi > 0) closeStats.winningTrades++;
  });

  const processReasons = (
    reasonsMap: Map<string, { trades: TCompleteTrade[]; winningTrades: number }>,
  ) => {
    const result: Record<string, { count: number; averageRoi: number; winRate: number }> = {};

    reasonsMap.forEach((stats, reason) => {
      const totalRoi = stats.trades.reduce((sum, trade) => sum + trade.roi, 0);
      result[reason] = {
        count: stats.trades.length,
        averageRoi: totalRoi / stats.trades.length,
        winRate: stats.winningTrades / stats.trades.length,
      };
    });

    return result;
  };

  return {
    openReasons: processReasons(openReasons),
    closeReasons: processReasons(closeReasons),
  };
}

// Функция для анализа рисков
function analyzeRisk(trades: TCompleteTrade[]) {
  const rois = trades.map((trade) => trade.roi);
  const profitableTrades = trades.filter((trade) => trade.roi > 0);
  const losingTrades = trades.filter((trade) => trade.roi <= 0);

  // Максимальная просадка
  let maxDrawdown = 0;
  let peak = 0;
  let cumulativeRoi = 0;

  rois.forEach((roi) => {
    cumulativeRoi += roi;
    if (cumulativeRoi > peak) {
      peak = cumulativeRoi;
    }
    const drawdown = peak > 0 ? (peak - cumulativeRoi) / peak : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // Максимальное количество убыточных сделок подряд
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;

  rois.forEach((roi) => {
    if (roi <= 0) {
      consecutiveLosses++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
    } else {
      consecutiveLosses = 0;
    }
  });

  // Волатильность
  const volatility = Number(math.std(rois));

  // Profit Factor
  const grossProfit = profitableTrades.reduce((sum, trade) => sum + trade.roi, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.roi, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    maxDrawdown,
    consecutiveLosses: maxConsecutiveLosses,
    volatility,
    profitFactor,
    largestWin: Math.max(...rois),
    largestLoss: Math.min(...rois),
  };
}

// Функция для экспорта в CSV
function exportToCSV(trades: TCompleteTrade[], filename: string) {
  const csvData = trades.map((trade) => ({
    id: trade.id,
    direction: trade.direction,
    symbolA: trade.symbolA,
    symbolB: trade.symbolB,
    pair: createPairName(trade.symbolA, trade.symbolB),
    quantityA: trade.quantityA,
    quantityB: trade.quantityB,
    openPriceA: trade.openPriceA,
    closePriceA: trade.closePriceA,
    openPriceB: trade.openPriceB,
    closePriceB: trade.closePriceB,
    openTime: new Date(trade.openTime).toISOString(),
    closeTime: new Date(trade.closeTime).toISOString(),
    holdingTimeMinutes: (trade.closeTime - trade.openTime) / (1000 * 60),
    roi: trade.roi,
    roiPercent: trade.roi * 100,
    openReason: trade.openReason,
    closeReason: trade.closeReason,
    profitable: trade.roi > 0 ? 'Yes' : 'No',
    openHour: new Date(trade.openTime).getHours(),
    openDayOfWeek: new Date(trade.openTime).toLocaleDateString('en-US', { weekday: 'long' }),
  }));

  const csvHeader = Object.keys(csvData[0]).join(',');
  const csvRows = csvData.map((row) => Object.values(row).join(','));
  const csvContent = [csvHeader, ...csvRows].join('\n');

  fs.writeFileSync(filename, csvContent);
  console.log(`📊 Данные экспортированы в ${filename}`);
}

// Функция для генерации рекомендаций
function generateRecommendations(analysis: AnalysisResult): string[] {
  const recommendations: string[] = [];

  // Анализ общей прибыльности
  if (analysis.profitabilityStats.winRate < 0.5) {
    recommendations.push(
      `🔴 Низкий винрейт (${(analysis.profitabilityStats.winRate * 100).toFixed(1)}%). Рекомендуется улучшить критерии входа в позицию.`,
    );
  } else {
    recommendations.push(
      `🟢 Хороший винрейт (${(analysis.profitabilityStats.winRate * 100).toFixed(1)}%). Стратегия показывает стабильность.`,
    );
  }

  // Анализ коэффициента Шарпа
  if (analysis.profitabilityStats.sharpeRatio < 1) {
    recommendations.push(
      `🔴 Низкий коэффициент Шарпа (${analysis.profitabilityStats.sharpeRatio.toFixed(2)}). Необходимо улучшить соотношение риск/доходность.`,
    );
  } else {
    recommendations.push(
      `🟢 Хороший коэффициент Шарпа (${analysis.profitabilityStats.sharpeRatio.toFixed(2)}). Риск-менеджмент работает эффективно.`,
    );
  }

  // Анализ времени удержания позиций
  const avgHoldingHours = analysis.timeAnalysis.averageHoldingTime / (1000 * 60 * 60);
  if (avgHoldingHours < 1) {
    recommendations.push(
      `⚠️ Очень короткое время удержания позиций (${avgHoldingHours.toFixed(1)}ч). Возможно, стоит увеличить время для реализации прибыли.`,
    );
  } else if (avgHoldingHours > 24) {
    recommendations.push(
      `⚠️ Слишком долгое время удержания позиций (${avgHoldingHours.toFixed(1)}ч). Рассмотрите более агрессивные критерии выхода.`,
    );
  }

  // Анализ лучших пар
  const bestPairs = analysis.pairAnalysis.mostProfitablePairs.slice(0, 3);
  recommendations.push(
    `💡 Наиболее прибыльные пары: ${bestPairs.map((p) => p.pairName).join(', ')}. Рекомендуется увеличить частоту торговли этими парами.`,
  );

  // Анализ худших пар
  const worstPairs = analysis.pairAnalysis.leastProfitablePairs.slice(0, 3);
  recommendations.push(
    `⚠️ Наименее прибыльные пары: ${worstPairs.map((p) => p.pairName).join(', ')}. Рекомендуется исключить или пересмотреть критерии для этих пар.`,
  );

  // Анализ лучших символов
  const bestSymbols = analysis.pairAnalysis.symbolAnalysis.mostProfitableSymbols.slice(0, 3);
  recommendations.push(
    `💰 Наиболее прибыльные активы: ${bestSymbols.map((s) => s.symbol).join(', ')}. Рекомендуется увеличить экспозицию к этим активам.`,
  );

  // Анализ рисков
  if (analysis.riskAnalysis.maxDrawdown > 0.2) {
    recommendations.push(
      `🔴 Высокая максимальная просадка (${(analysis.riskAnalysis.maxDrawdown * 100).toFixed(1)}%). Необходимо усилить риск-менеджмент.`,
    );
  }

  if (analysis.riskAnalysis.consecutiveLosses > 5) {
    recommendations.push(
      `⚠️ Высокое количество убыточных сделок подряд (${analysis.riskAnalysis.consecutiveLosses}). Рекомендуется добавить фильтры для снижения серий убытков.`,
    );
  }

  if (analysis.riskAnalysis.profitFactor < 1.5) {
    recommendations.push(
      `🔴 Низкий Profit Factor (${analysis.riskAnalysis.profitFactor.toFixed(2)}). Необходимо улучшить соотношение прибыльных и убыточных сделок.`,
    );
  } else {
    recommendations.push(
      `🟢 Хороший Profit Factor (${analysis.riskAnalysis.profitFactor.toFixed(2)}). Стратегия эффективно управляет рисками.`,
    );
  }

  // Временной анализ
  const bestHours = Object.entries(analysis.timeAnalysis.hourlyAnalysis)
    .filter(([, stats]) => stats.totalTrades >= 10)
    .sort(([, a], [, b]) => b.averageRoi - a.averageRoi)
    .slice(0, 3);

  if (bestHours.length > 0) {
    recommendations.push(
      `⏰ Наиболее прибыльные часы торговли: ${bestHours.map(([hour]) => `${hour}:00`).join(', ')}. Рекомендуется сосредоточить торговлю в эти часы.`,
    );
  }

  return recommendations;
}

// Основная функция анализа
export function analyzeData(fileName: string = 'noHurst.json'): AnalysisResult {
  console.log(`🔍 Начинаю анализ данных ${fileName}...`);

  const reports = loadData(fileName);
  const reportsWithTrades = reports.filter(
    (report) => report.backtestTrades && report.backtestTrades.length > 0,
  );
  const allTrades = getAllTrades(reports);

  console.log(`📊 Загружено ${reports.length} отчетов, ${reportsWithTrades.length} с сделками`);
  console.log(`💰 Общее количество сделок: ${allTrades.length}`);

  const profitabilityStats = calculateProfitabilityStats(allTrades);
  const timeAnalysis = analyzeHoldingTime(allTrades);
  const pairAnalysis = analyzePairs(allTrades);
  const reasonAnalysis = analyzeReasons(allTrades);
  const riskAnalysis = analyzeRisk(allTrades);

  const analysis: AnalysisResult = {
    totalReports: reports.length,
    reportsWithTrades: reportsWithTrades.length,
    totalTrades: allTrades.length,
    profitabilityStats,
    timeAnalysis,
    pairAnalysis,
    reasonAnalysis,
    riskAnalysis,
    recommendations: [],
  };

  analysis.recommendations = generateRecommendations(analysis);

  // Экспорт данных в CSV
  const csvFileName = fileName.replace('.json', '_analysis.csv');
  const csvPath = path.join(__dirname, 'reports', csvFileName);
  exportToCSV(allTrades, csvPath);

  return analysis;
}

// Функция для вывода результатов анализа
export function printAnalysis(analysis: AnalysisResult) {
  console.log('\n' + '='.repeat(60));
  console.log('📈 РЕЗУЛЬТАТЫ АНАЛИЗА ТОРГОВОЙ СТРАТЕГИИ');
  console.log('='.repeat(60));

  console.log('\n📊 ОБЩАЯ СТАТИСТИКА:');
  console.log(`   Всего отчетов: ${analysis.totalReports}`);
  console.log(`   Отчетов с сделками: ${analysis.reportsWithTrades}`);
  console.log(`   Общее количество сделок: ${analysis.totalTrades}`);

  console.log('\n💰 СТАТИСТИКА ПРИБЫЛЬНОСТИ:');
  console.log(`   Общая прибыль: ${analysis.profitabilityStats.totalProfit.toFixed(4)}`);
  console.log(`   Средний ROI: ${(analysis.profitabilityStats.averageRoi * 100).toFixed(2)}%`);
  console.log(`   Медианный ROI: ${(analysis.profitabilityStats.medianRoi * 100).toFixed(2)}%`);
  console.log(`   Винрейт: ${(analysis.profitabilityStats.winRate * 100).toFixed(1)}%`);
  console.log(
    `   Максимальная прибыль: ${(analysis.profitabilityStats.maxProfit * 100).toFixed(2)}%`,
  );
  console.log(`   Максимальный убыток: ${(analysis.profitabilityStats.maxLoss * 100).toFixed(2)}%`);
  console.log(`   Коэффициент Шарпа: ${analysis.profitabilityStats.sharpeRatio.toFixed(2)}`);

  console.log('\n⏱️ АНАЛИЗ ВРЕМЕНИ УДЕРЖАНИЯ:');
  console.log(
    `   Среднее время удержания: ${(analysis.timeAnalysis.averageHoldingTime / (1000 * 60 * 60)).toFixed(1)} часов`,
  );
  console.log(
    `   Медианное время удержания: ${(analysis.timeAnalysis.medianHoldingTime / (1000 * 60 * 60)).toFixed(1)} часов`,
  );
  console.log(
    `   Самая короткая сделка: ${(analysis.timeAnalysis.shortestTrade / (1000 * 60)).toFixed(1)} минут`,
  );
  console.log(
    `   Самая длинная сделка: ${(analysis.timeAnalysis.longestTrade / (1000 * 60 * 60)).toFixed(1)} часов`,
  );

  console.log('\n🔥 ТОП-5 САМЫХ ПРИБЫЛЬНЫХ ПАР:');
  analysis.pairAnalysis.mostProfitablePairs.slice(0, 5).forEach((pair, index) => {
    console.log(
      `   ${index + 1}. ${pair.pairName}: ${pair.totalTrades} сделок, прибыль: ${pair.totalProfit.toFixed(4)}, средний ROI: ${(pair.averageRoi * 100).toFixed(2)}%, винрейт: ${(pair.winRate * 100).toFixed(1)}%`,
    );
  });

  console.log('\n❌ ТОП-5 НАИМЕНЕЕ ПРИБЫЛЬНЫХ ПАР:');
  analysis.pairAnalysis.leastProfitablePairs.slice(0, 5).forEach((pair, index) => {
    console.log(
      `   ${index + 1}. ${pair.pairName}: ${pair.totalTrades} сделок, прибыль: ${pair.totalProfit.toFixed(4)}, средний ROI: ${(pair.averageRoi * 100).toFixed(2)}%, винрейт: ${(pair.winRate * 100).toFixed(1)}%`,
    );
  });

  console.log('\n📋 АНАЛИЗ ПРИЧИН ОТКРЫТИЯ ПОЗИЦИЙ:');
  Object.entries(analysis.reasonAnalysis.openReasons)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .forEach(([reason, stats]) => {
      console.log(
        `   ${reason}: ${stats.count} сделок, средний ROI: ${(stats.averageRoi * 100).toFixed(2)}%, винрейт: ${(stats.winRate * 100).toFixed(1)}%`,
      );
    });

  console.log('\n📋 АНАЛИЗ ПРИЧИН ЗАКРЫТИЯ ПОЗИЦИЙ:');
  Object.entries(analysis.reasonAnalysis.closeReasons)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .forEach(([reason, stats]) => {
      console.log(
        `   ${reason}: ${stats.count} сделок, средний ROI: ${(stats.averageRoi * 100).toFixed(2)}%, винрейт: ${(stats.winRate * 100).toFixed(1)}%`,
      );
    });

  console.log('\n🎯 АНАЛИЗ РИСКОВ:');
  console.log(`   Максимальная просадка: ${(analysis.riskAnalysis.maxDrawdown * 100).toFixed(1)}%`);
  console.log(
    `   Максимальное количество убыточных сделок подряд: ${analysis.riskAnalysis.consecutiveLosses}`,
  );
  console.log(`   Волатильность: ${analysis.riskAnalysis.volatility.toFixed(4)}`);
  console.log(`   Profit Factor: ${analysis.riskAnalysis.profitFactor.toFixed(2)}`);
  console.log(`   Наибольший выигрыш: ${(analysis.riskAnalysis.largestWin * 100).toFixed(2)}%`);
  console.log(`   Наибольший проигрыш: ${(analysis.riskAnalysis.largestLoss * 100).toFixed(2)}%`);

  console.log('\n💰 ТОП-5 НАИБОЛЕЕ ПРИБЫЛЬНЫХ АКТИВОВ:');
  analysis.pairAnalysis.symbolAnalysis.mostProfitableSymbols
    .slice(0, 5)
    .forEach((symbol, index) => {
      console.log(
        `   ${index + 1}. ${symbol.symbol}: ${symbol.totalTrades} сделок, прибыль: ${symbol.totalProfit.toFixed(4)}, средний ROI: ${(symbol.averageRoi * 100).toFixed(2)}%, винрейт: ${(symbol.winRate * 100).toFixed(1)}%`,
      );
    });

  console.log('\n⏰ АНАЛИЗ ПО ЧАСАМ (ТОП-5):');
  Object.entries(analysis.timeAnalysis.hourlyAnalysis)
    .filter(([, stats]) => stats.totalTrades >= 10)
    .sort(([, a], [, b]) => b.averageRoi - a.averageRoi)
    .slice(0, 5)
    .forEach(([hour, stats]) => {
      console.log(
        `   ${hour}:00: ${stats.totalTrades} сделок, средний ROI: ${(stats.averageRoi * 100).toFixed(2)}%, винрейт: ${(stats.winRate * 100).toFixed(1)}%`,
      );
    });

  console.log('\n📅 АНАЛИЗ ПО ДНЯМ НЕДЕЛИ:');
  Object.entries(analysis.timeAnalysis.dailyAnalysis)
    .sort(([, a], [, b]) => b.averageRoi - a.averageRoi)
    .forEach(([day, stats]) => {
      console.log(
        `   ${day}: ${stats.totalTrades} сделок, средний ROI: ${(stats.averageRoi * 100).toFixed(2)}%, винрейт: ${(stats.winRate * 100).toFixed(1)}%`,
      );
    });

  console.log('\n💡 РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ СТРАТЕГИИ:');
  analysis.recommendations.forEach((recommendation, index) => {
    console.log(`   ${index + 1}. ${recommendation}`);
  });

  console.log('\n' + '='.repeat(60));
}

// Запуск анализа
if (require.main === module) {
  try {
    // Получаем название файла из аргументов командной строки
    const fileName = process.argv[2] || 'noHurst.json';
    console.log(`📁 Анализируем файл: ${fileName}`);

    const analysis = analyzeData(fileName);
    printAnalysis(analysis);
  } catch (error) {
    console.error('❌ Ошибка при анализе данных:', error);
  }
}
