import { Op, WhereOptions, QueryTypes } from 'sequelize';

import { dayjs } from '../../shared/utils/daytime';
import { measureTime } from '../utils/performance/measureTime';
import { mrReportLogger as logger, backtestLogger } from '../utils/logger';
import { run } from '../trading/strategies/MRStrategy/backtest';
import { buildMrReport } from '../modules/mrReportBuilder';
import { MRReport, MRReportPair, MRReportBacktestTrade } from '../models/MRReport';

export const getReportList = async (startDate?: number, endDate?: number, tagId?: number) => {
  const whereClause: WhereOptions = {};
  if (startDate && endDate) {
    whereClause.date = {
      [Op.between]: [startDate, endDate],
    };
  }

  if (tagId) {
    whereClause.tagId = tagId;
  }

  const reports = await MRReport.findAll({
    where: whereClause,
    include: [
      {
        model: MRReportBacktestTrade,
        as: 'backtestTrades',
        required: false,
      },
    ],
    order: [['date', 'ASC']],
  });

  // Получаем количество записей для каждого отчета отдельным запросом
  const reportIds = reports.map((report) => report.id);
  const entryCounts = (await MRReportPair.findAll({
    where: { reportId: { [Op.in]: reportIds } },
    attributes: [
      'reportId',
      [MRReportPair.sequelize!.fn('COUNT', MRReportPair.sequelize!.col('id')), 'count'],
    ],
    group: ['reportId'],
    raw: true,
  })) as unknown as Array<{ reportId: number; count: number }>;

  const entryCountMap = entryCounts.reduce(
    (acc, entry) => {
      acc[entry.reportId] = Number(entry.count);
      return acc;
    },
    {} as Record<number, number>,
  );

  return reports.map((report) => ({
    id: report.reportId,
    date: report.date,
    tagId: report.tagId,
    pairsCount: entryCountMap[report.id] || 0,
    lastBacktestAt: report.lastBacktestAt,
    backtestTrades: report.lastBacktestAt
      ? (report.backtestTrades || []).map((trade) => ({
          id: trade.tradeId,
          direction: trade.direction,
          symbolA: trade.symbolA,
          symbolB: trade.symbolB,
          quantityA: trade.quantityA,
          quantityB: trade.quantityB,
          openPriceA: trade.openPriceA,
          closePriceA: trade.closePriceA,
          openPriceB: trade.openPriceB,
          closePriceB: trade.closePriceB,
          openTime: trade.openTime,
          closeTime: trade.closeTime,
          roi: trade.roi,
          openReason: trade.openReason,
          closeReason: trade.closeReason,
        }))
      : null,
  }));
};

export const createReport = measureTime(
  'Report creation',
  async (date: number, tagId: number) => {
    const id = `${date}`;
    const reportData = await buildMrReport(date);

    const transaction = await MRReport.sequelize!.transaction();

    try {
      const report = await MRReport.create(
        {
          reportId: id,
          date,
          tagId,
        },
        { transaction },
      );

      await MRReportPair.bulkCreate(
        reportData.map((entry) => ({
          reportId: report.id,
          assetABaseAsset: entry.assetA.baseAsset,
          assetAQuoteAsset: entry.assetA.quoteAsset,
          assetBBaseAsset: entry.assetB.baseAsset,
          assetBQuoteAsset: entry.assetB.quoteAsset,
          pValue: entry.pValue,
          halfLife: entry.halfLife,
          correlationByPrices: entry.correlationByPrices,
          correlationByReturns: entry.correlationByReturns,
          crossings: entry.crossings,
          spreadMean: entry.spread.mean,
          spreadMedian: entry.spread.median,
          spreadStd: entry.spread.std,
          score: entry.score,
        })),
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  logger.info,
);

export const getReport = async (id: string) => {
  const report = await MRReport.findOne({
    where: { reportId: id },
    include: [
      {
        model: MRReportPair,
        as: 'pairs',
      },
      {
        model: MRReportBacktestTrade,
        as: 'backtestTrades',
        required: false,
      },
    ],
  });

  if (!report) {
    return null;
  }

  const pairs = (report.pairs || []).map((entry) => ({
    assetA: {
      baseAsset: entry.assetABaseAsset,
      quoteAsset: entry.assetAQuoteAsset,
    },
    assetB: {
      baseAsset: entry.assetBBaseAsset,
      quoteAsset: entry.assetBQuoteAsset,
    },
    pValue: entry.pValue,
    halfLife: entry.halfLife,
    correlationByPrices: entry.correlationByPrices,
    correlationByReturns: entry.correlationByReturns,
    crossings: entry.crossings,
    spread: {
      mean: entry.spreadMean,
      median: entry.spreadMedian,
      std: entry.spreadStd,
    },
    score: entry.score,
  }));

  return {
    id: report.reportId,
    date: report.date,
    tagId: report.tagId,
    pairs,
    pairsCount: pairs.length,
    lastBacktestAt: report.lastBacktestAt,
    backtestTrades: report.lastBacktestAt
      ? (report.backtestTrades || []).map((trade) => ({
          id: trade.tradeId,
          direction: trade.direction,
          symbolA: trade.symbolA,
          symbolB: trade.symbolB,
          quantityA: trade.quantityA,
          quantityB: trade.quantityB,
          openPriceA: trade.openPriceA,
          closePriceA: trade.closePriceA,
          openPriceB: trade.openPriceB,
          closePriceB: trade.closePriceB,
          openTime: trade.openTime,
          closeTime: trade.closeTime,
          roi: trade.roi,
          openReason: trade.openReason,
          closeReason: trade.closeReason,
        }))
      : null,
  };
};

export const updateReport = async (id: string) => {
  const report = await getReport(id);
  if (!report) {
    return;
  }

  await deleteReport(id);
  await createReport(report.date, report.tagId);
};

export const deleteReport = async (id: string) => {
  await MRReport.destroy({
    where: { reportId: id },
  });
};

export const createReportBacktest = async (
  id: string,
  startTimestamp: number,
  endTimestamp: number,
) => {
  const report = await getReport(id);
  if (!report) {
    return null;
  }

  const reportModel = await MRReport.findOne({
    where: { reportId: id },
  });

  if (!reportModel) {
    return null;
  }

  backtestLogger.info(
    `Backtesting for the report: ${dayjs(report.date).format('DD.MM.YYYY HH:mm')}. Start: ${dayjs(startTimestamp).format('DD.MM.YYYY HH:mm')}. End: ${dayjs(endTimestamp).format('DD.MM.YYYY HH:mm')}`,
  );

  const reportBacktest = await run(
    report.pairs.map(({ assetA, assetB }) => ({
      assetA,
      assetB,
    })),
    startTimestamp,
    endTimestamp,
  );

  await MRReportBacktestTrade.bulkCreate(
    reportBacktest.map((trade) => ({
      reportId: reportModel.id,
      tradeId: trade.id,
      direction: trade.direction,
      symbolA: trade.symbolA,
      symbolB: trade.symbolB,
      quantityA: trade.quantityA,
      quantityB: trade.quantityB,
      openPriceA: trade.openPriceA,
      closePriceA: trade.closePriceA,
      openPriceB: trade.openPriceB,
      closePriceB: trade.closePriceB,
      openTime: trade.openTime,
      closeTime: trade.closeTime,
      roi: trade.roi,
      openReason: trade.openReason,
      closeReason: trade.closeReason,
    })),
  );

  // Обновляем дату последнего бэктеста
  await reportModel.update({
    lastBacktestAt: new Date(),
  });
};

export const deleteReportBacktest = async (id: string) => {
  const report = await MRReport.findOne({
    where: { reportId: id },
  });

  if (!report) {
    return null;
  }

  await MRReportBacktestTrade.destroy({
    where: { reportId: report.id },
  });

  // Сбрасываем дату последнего бэктеста
  await report.update({
    lastBacktestAt: null,
  });
};

export const getBacktestTradesByPairScore = async () => {
  const sequelize = MRReport.sequelize!;

  // Выполняем группировку прямо в базе данных
  const results = (await sequelize.query(
    `
    SELECT 
      FLOOR(p.score * 10) / 10 as score,
      COUNT(*) as trades_count,
      AVG(t.roi) as average_roi,
      SUM(t.roi) as total_roi,
      MIN(t.roi) as min_roi,
      MAX(t.roi) as max_roi
    FROM mr_report_backtest_trades t 
    INNER JOIN mr_report_pairs p ON (
      t."reportId" = p."reportId" 
      AND (
        (t."symbolA" = p."assetABaseAsset" || p."assetAQuoteAsset" AND t."symbolB" = p."assetBBaseAsset" || p."assetBQuoteAsset")
        OR
        (t."symbolA" = p."assetBBaseAsset" || p."assetBQuoteAsset" AND t."symbolB" = p."assetABaseAsset" || p."assetAQuoteAsset")
      )
    )
    GROUP BY FLOOR(p.score * 10) / 10
    ORDER BY score ASC
  `,
    {
      type: QueryTypes.SELECT,
    },
  )) as Array<{
    score: string;
    trades_count: string;
    average_roi: string;
    total_roi: string;
    min_roi: string;
    max_roi: string;
  }>;

  return results.map((result) => ({
    score: parseFloat(result.score),
    tradesCount: parseInt(result.trades_count),
    averageRoi: parseFloat(result.average_roi),
    totalRoi: parseFloat(result.total_roi),
    minRoi: parseFloat(result.min_roi),
    maxRoi: parseFloat(result.max_roi),
  }));
};
