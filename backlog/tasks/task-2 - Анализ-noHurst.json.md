---
id: task-2
title: Анализ noHurst.json
status: Done
assignee: []
created_date: '2025-07-10'
completed_date: '2025-07-10'
labels: []
dependencies: []
---

## Description

Необходимо написать скрипт в src/server/modules/analysis/analyse.ts, который произведёт анализ отчёта src/server/modules/analysis/reports/noHurst.json и даст инсайты по улучшения торговой стратегии. В src/server/modules/analysis/reports/noHurst.json лежат множественные результаты бектестинга с интервалом в 1 час за 60 дней. Бектестинг проводится по парам отобранным предварительно, отбор которых производится тоже раз в 1 час.

## Результат выполнения

✅ **Создан комплексный скрипт анализа** `src/server/modules/analysis/analyse.ts`

### Реализованные функции:

- 📊 **Базовая статистика**: ROI, винрейт, коэффициент Шарпа
- 🔍 **Анализ торговых пар**: Определение наиболее и наименее прибыльных пар
- 💰 **Анализ активов**: Статистика по отдельным криптовалютам
- ⏰ **Временной анализ**: Анализ по часам и дням недели
- 🎯 **Анализ рисков**: Максимальная просадка, серии убытков, волатильность
- 📋 **Анализ причин**: Причины открытия и закрытия позиций
- 📊 **Экспорт в CSV**: Детализированные данные по каждой сделке

### Ключевые результаты анализа:

- **Объем данных**: 1,417 отчетов, 25,620 сделок
- **Винрейт**: 76.8% (очень хороший показатель)
- **Средний ROI**: 12.97%
- **Profit Factor**: 2.90 (хороший показатель)
- **Максимальная просадка**: 66.0% (требует внимания)

### Рекомендации для улучшения стратегии:

1. **Увеличить экспозицию** к наиболее прибыльным активам: ARKMUSDT, RAREUSDT, THETAUSDT
2. **Исключить убыточные пары**: SOLEUR/SOLFDUSD, SOLUSDT/SOLEUR, DOGEUSDT/DOGEEUR
3. **Сосредоточить торговлю** в наиболее прибыльные часы: 20:00, 16:00, 21:00
4. **Усилить риск-менеджмент** для снижения просадки с 66% до приемлемого уровня
5. **Добавить фильтры** для уменьшения серий убытков (макс. 78 подряд)

### Созданные файлы:

- `src/server/modules/analysis/analyse.ts` - основной скрипт анализа
- `src/server/modules/analysis/README.md` - документация
- `src/server/modules/analysis/reports/trading_analysis.csv` - детализированные данные (6.8MB)

В noHurst.json содержится TMRReport[], где

type TMRReportPair = {
assetA: {
baseAsset: string;
quoteAsset: string;
};
assetB: {
baseAsset: string;
quoteAsset: string;
};
pValue: number;
halfLife: number;
correlationByPrices: number;
correlationByReturns: number;
crossings: number;
spread: {
mean: number;
median: number;
std: number;
};
score: number;
}

type TMRReport = {
id: number;
date: number;
tagId: number;
pairs?: TMRReportPair[];
pairsCount?: number;
lastBacktestAt: Date | null;
backtestTrades: TCompleteTrade[] | null;
};

type TPositionDirection = 'buy-sell' | 'sell-buy';

type TOpenTrade = {
direction: TPositionDirection;
symbolA: string;
symbolB: string;
quantityA: number;
quantityB: number;
openPriceA: number;
openPriceB: number;
openTime: number;
reason: string;
}
