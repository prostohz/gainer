import { analyzeData, AnalysisResult } from './analyse';

interface ComparisonResult {
  strategy1Name: string;
  strategy2Name: string;
  strategy1: AnalysisResult;
  strategy2: AnalysisResult;
  comparison: {
    totalTrades: {
      strategy1: number;
      strategy2: number;
      difference: number;
      percentDifference: number;
    };
    winRate: {
      strategy1: number;
      strategy2: number;
      difference: number;
    };
    averageRoi: {
      strategy1: number;
      strategy2: number;
      difference: number;
    };
    sharpeRatio: {
      strategy1: number;
      strategy2: number;
      difference: number;
    };
    maxDrawdown: {
      strategy1: number;
      strategy2: number;
      difference: number;
    };
    profitFactor: {
      strategy1: number;
      strategy2: number;
      difference: number;
    };
    selectivity: {
      strategy1: number; // процент отчетов с сделками
      strategy2: number;
      difference: number;
    };
  };
  insights: string[];
}

function calculatePercentDifference(value1: number, value2: number): number {
  if (value1 === 0) return value2 === 0 ? 0 : 100;
  return ((value2 - value1) / value1) * 100;
}

function compareStrategies(fileName1: string, fileName2: string): ComparisonResult {
  console.log(`🔍 Сравнительный анализ стратегий:`);
  console.log(`   📊 Стратегия 1: ${fileName1}`);
  console.log(`   📊 Стратегия 2: ${fileName2}`);

  const analysis1 = analyzeData(fileName1);
  const analysis2 = analyzeData(fileName2);

  const selectivity1 = (analysis1.reportsWithTrades / analysis1.totalReports) * 100;
  const selectivity2 = (analysis2.reportsWithTrades / analysis2.totalReports) * 100;

  const comparison: ComparisonResult = {
    strategy1Name: fileName1.replace('.json', ''),
    strategy2Name: fileName2.replace('.json', ''),
    strategy1: analysis1,
    strategy2: analysis2,
    comparison: {
      totalTrades: {
        strategy1: analysis1.totalTrades,
        strategy2: analysis2.totalTrades,
        difference: analysis2.totalTrades - analysis1.totalTrades,
        percentDifference: calculatePercentDifference(analysis1.totalTrades, analysis2.totalTrades),
      },
      winRate: {
        strategy1: analysis1.profitabilityStats.winRate,
        strategy2: analysis2.profitabilityStats.winRate,
        difference: analysis2.profitabilityStats.winRate - analysis1.profitabilityStats.winRate,
      },
      averageRoi: {
        strategy1: analysis1.profitabilityStats.averageRoi,
        strategy2: analysis2.profitabilityStats.averageRoi,
        difference:
          analysis2.profitabilityStats.averageRoi - analysis1.profitabilityStats.averageRoi,
      },
      sharpeRatio: {
        strategy1: analysis1.profitabilityStats.sharpeRatio,
        strategy2: analysis2.profitabilityStats.sharpeRatio,
        difference:
          analysis2.profitabilityStats.sharpeRatio - analysis1.profitabilityStats.sharpeRatio,
      },
      maxDrawdown: {
        strategy1: analysis1.riskAnalysis.maxDrawdown,
        strategy2: analysis2.riskAnalysis.maxDrawdown,
        difference: analysis2.riskAnalysis.maxDrawdown - analysis1.riskAnalysis.maxDrawdown,
      },
      profitFactor: {
        strategy1: analysis1.riskAnalysis.profitFactor,
        strategy2: analysis2.riskAnalysis.profitFactor,
        difference: analysis2.riskAnalysis.profitFactor - analysis1.riskAnalysis.profitFactor,
      },
      selectivity: {
        strategy1: selectivity1,
        strategy2: selectivity2,
        difference: selectivity2 - selectivity1,
      },
    },
    insights: [],
  };

  // Генерация инсайтов
  const insights: string[] = [];

  // Анализ объема торговли
  if (Math.abs(comparison.comparison.totalTrades.percentDifference) > 50) {
    const moreActive =
      comparison.comparison.totalTrades.strategy1 > comparison.comparison.totalTrades.strategy2
        ? comparison.strategy1Name
        : comparison.strategy2Name;

    insights.push(
      `📊 ${moreActive} значительно более активна в торговле (${Math.abs(comparison.comparison.totalTrades.percentDifference).toFixed(1)}% разница)`,
    );
  }

  // Анализ селективности
  if (Math.abs(comparison.comparison.selectivity.difference) > 10) {
    const moreSelective =
      comparison.comparison.selectivity.strategy1 > comparison.comparison.selectivity.strategy2
        ? comparison.strategy1Name
        : comparison.strategy2Name;

    insights.push(
      `🎯 ${moreSelective} более селективна (${Math.abs(comparison.comparison.selectivity.difference).toFixed(1)}% разница в частоте торговли)`,
    );
  }

  // Анализ винрейта
  if (Math.abs(comparison.comparison.winRate.difference) > 0.02) {
    const betterWinRate =
      comparison.comparison.winRate.strategy1 > comparison.comparison.winRate.strategy2
        ? comparison.strategy1Name
        : comparison.strategy2Name;

    insights.push(
      `🏆 ${betterWinRate} показывает лучший винрейт (${Math.abs(comparison.comparison.winRate.difference * 100).toFixed(1)}% разница)`,
    );
  }

  // Анализ ROI
  if (Math.abs(comparison.comparison.averageRoi.difference) > 0.01) {
    const betterRoi =
      comparison.comparison.averageRoi.strategy1 > comparison.comparison.averageRoi.strategy2
        ? comparison.strategy1Name
        : comparison.strategy2Name;

    insights.push(
      `💰 ${betterRoi} показывает лучший средний ROI (${Math.abs(comparison.comparison.averageRoi.difference * 100).toFixed(2)}% разница)`,
    );
  }

  // Анализ коэффициента Шарпа
  if (Math.abs(comparison.comparison.sharpeRatio.difference) > 0.05) {
    const betterSharpe =
      comparison.comparison.sharpeRatio.strategy1 > comparison.comparison.sharpeRatio.strategy2
        ? comparison.strategy1Name
        : comparison.strategy2Name;

    insights.push(
      `📈 ${betterSharpe} показывает лучший коэффициент Шарпа (${Math.abs(comparison.comparison.sharpeRatio.difference).toFixed(2)} разница)`,
    );
  }

  // Анализ Profit Factor
  if (Math.abs(comparison.comparison.profitFactor.difference) > 0.2) {
    const betterPF =
      comparison.comparison.profitFactor.strategy1 > comparison.comparison.profitFactor.strategy2
        ? comparison.strategy1Name
        : comparison.strategy2Name;

    insights.push(
      `🎯 ${betterPF} показывает лучший Profit Factor (${Math.abs(comparison.comparison.profitFactor.difference).toFixed(2)} разница)`,
    );
  }

  // Анализ просадки
  if (
    isFinite(comparison.comparison.maxDrawdown.strategy1) &&
    isFinite(comparison.comparison.maxDrawdown.strategy2)
  ) {
    if (Math.abs(comparison.comparison.maxDrawdown.difference) > 0.1) {
      const betterDD =
        comparison.comparison.maxDrawdown.strategy1 < comparison.comparison.maxDrawdown.strategy2
          ? comparison.strategy1Name
          : comparison.strategy2Name;

      insights.push(
        `🛡️ ${betterDD} показывает лучший контроль просадки (${Math.abs(comparison.comparison.maxDrawdown.difference * 100).toFixed(1)}% разница)`,
      );
    }
  }

  // Общий вывод
  let betterStrategy = '';
  let score1 = 0;
  let score2 = 0;

  if (comparison.comparison.winRate.strategy1 > comparison.comparison.winRate.strategy2) score1++;
  else score2++;
  if (comparison.comparison.averageRoi.strategy1 > comparison.comparison.averageRoi.strategy2)
    score1++;
  else score2++;
  if (comparison.comparison.sharpeRatio.strategy1 > comparison.comparison.sharpeRatio.strategy2)
    score1++;
  else score2++;
  if (comparison.comparison.profitFactor.strategy1 > comparison.comparison.profitFactor.strategy2)
    score1++;
  else score2++;

  if (score1 > score2) {
    betterStrategy = comparison.strategy1Name;
    insights.push(
      `🏅 Общий вывод: ${betterStrategy} показывает лучшие результаты по большинству ключевых метрик`,
    );
  } else if (score2 > score1) {
    betterStrategy = comparison.strategy2Name;
    insights.push(
      `🏅 Общий вывод: ${betterStrategy} показывает лучшие результаты по большинству ключевых метрик`,
    );
  } else {
    insights.push(
      `🤝 Общий вывод: Обе стратегии показывают сопоставимые результаты с разными сильными сторонами`,
    );
  }

  comparison.insights = insights;

  return comparison;
}

function printComparison(comparison: ComparisonResult) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 СРАВНИТЕЛЬНЫЙ АНАЛИЗ ТОРГОВЫХ СТРАТЕГИЙ');
  console.log('='.repeat(80));

  console.log(`\n📈 СТРАТЕГИЯ 1: ${comparison.strategy1Name.toUpperCase()}`);
  console.log(`📈 СТРАТЕГИЯ 2: ${comparison.strategy2Name.toUpperCase()}`);

  console.log('\n📊 СРАВНЕНИЕ КЛЮЧЕВЫХ МЕТРИК:');
  console.log(`   Общее количество сделок:`);
  console.log(
    `     ${comparison.strategy1Name}: ${comparison.comparison.totalTrades.strategy1.toLocaleString()}`,
  );
  console.log(
    `     ${comparison.strategy2Name}: ${comparison.comparison.totalTrades.strategy2.toLocaleString()}`,
  );
  console.log(
    `     Разница: ${comparison.comparison.totalTrades.difference > 0 ? '+' : ''}${comparison.comparison.totalTrades.difference.toLocaleString()} (${comparison.comparison.totalTrades.percentDifference.toFixed(1)}%)`,
  );

  console.log(`\n   Селективность (% отчетов с сделками):`);
  console.log(
    `     ${comparison.strategy1Name}: ${comparison.comparison.selectivity.strategy1.toFixed(1)}%`,
  );
  console.log(
    `     ${comparison.strategy2Name}: ${comparison.comparison.selectivity.strategy2.toFixed(1)}%`,
  );
  console.log(
    `     Разница: ${comparison.comparison.selectivity.difference > 0 ? '+' : ''}${comparison.comparison.selectivity.difference.toFixed(1)}%`,
  );

  console.log(`\n   Винрейт:`);
  console.log(
    `     ${comparison.strategy1Name}: ${(comparison.comparison.winRate.strategy1 * 100).toFixed(1)}%`,
  );
  console.log(
    `     ${comparison.strategy2Name}: ${(comparison.comparison.winRate.strategy2 * 100).toFixed(1)}%`,
  );
  console.log(
    `     Разница: ${comparison.comparison.winRate.difference > 0 ? '+' : ''}${(comparison.comparison.winRate.difference * 100).toFixed(1)}%`,
  );

  console.log(`\n   Средний ROI:`);
  console.log(
    `     ${comparison.strategy1Name}: ${(comparison.comparison.averageRoi.strategy1 * 100).toFixed(2)}%`,
  );
  console.log(
    `     ${comparison.strategy2Name}: ${(comparison.comparison.averageRoi.strategy2 * 100).toFixed(2)}%`,
  );
  console.log(
    `     Разница: ${comparison.comparison.averageRoi.difference > 0 ? '+' : ''}${(comparison.comparison.averageRoi.difference * 100).toFixed(2)}%`,
  );

  console.log(`\n   Коэффициент Шарпа:`);
  console.log(
    `     ${comparison.strategy1Name}: ${comparison.comparison.sharpeRatio.strategy1.toFixed(2)}`,
  );
  console.log(
    `     ${comparison.strategy2Name}: ${comparison.comparison.sharpeRatio.strategy2.toFixed(2)}`,
  );
  console.log(
    `     Разница: ${comparison.comparison.sharpeRatio.difference > 0 ? '+' : ''}${comparison.comparison.sharpeRatio.difference.toFixed(2)}`,
  );

  console.log(`\n   Profit Factor:`);
  console.log(
    `     ${comparison.strategy1Name}: ${comparison.comparison.profitFactor.strategy1.toFixed(2)}`,
  );
  console.log(
    `     ${comparison.strategy2Name}: ${comparison.comparison.profitFactor.strategy2.toFixed(2)}`,
  );
  console.log(
    `     Разница: ${comparison.comparison.profitFactor.difference > 0 ? '+' : ''}${comparison.comparison.profitFactor.difference.toFixed(2)}`,
  );

  if (
    isFinite(comparison.comparison.maxDrawdown.strategy1) &&
    isFinite(comparison.comparison.maxDrawdown.strategy2)
  ) {
    console.log(`\n   Максимальная просадка:`);
    console.log(
      `     ${comparison.strategy1Name}: ${(comparison.comparison.maxDrawdown.strategy1 * 100).toFixed(1)}%`,
    );
    console.log(
      `     ${comparison.strategy2Name}: ${(comparison.comparison.maxDrawdown.strategy2 * 100).toFixed(1)}%`,
    );
    console.log(
      `     Разница: ${comparison.comparison.maxDrawdown.difference > 0 ? '+' : ''}${(comparison.comparison.maxDrawdown.difference * 100).toFixed(1)}%`,
    );
  }

  console.log('\n💡 КЛЮЧЕВЫЕ ИНСАЙТЫ:');
  comparison.insights.forEach((insight, index) => {
    console.log(`   ${index + 1}. ${insight}`);
  });

  console.log('\n' + '='.repeat(80));
}

// Запуск сравнения
if (require.main === module) {
  try {
    const file1 = process.argv[2] || 'noHurst.json';
    const file2 = process.argv[3] || 'improvedEGT.json';

    console.log(`🔍 Сравниваем файлы: ${file1} vs ${file2}`);

    const comparison = compareStrategies(file1, file2);
    printComparison(comparison);
  } catch (error) {
    console.error('❌ Ошибка при сравнении стратегий:', error);
  }
}

export { compareStrategies, printComparison, type ComparisonResult };
