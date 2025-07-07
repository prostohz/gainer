import { Sequelize } from 'sequelize';

import { DATABASE_CONFIG } from '../../configs/database';
import { MRReportEntry } from '../../models/MRReport/MRReportEntry';
import { calculatePairScore } from './pairScore';

const sequelize = new Sequelize(DATABASE_CONFIG);

const recalculateScores = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    console.log('Fetching all MRReportEntry records...');
    const entries = await MRReportEntry.findAll();
    console.log(`Found ${entries.length} entries to process.`);

    let processedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)}`,
      );

      const updates = batch.map((entry) => {
        const pairData = {
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
        };

        const score = calculatePairScore(pairData);

        return MRReportEntry.update({ score }, { where: { id: entry.id } });
      });

      await Promise.all(updates);
      processedCount += batch.length;

      console.log(
        `Processed ${processedCount}/${entries.length} entries (${((processedCount / entries.length) * 100).toFixed(1)}%)`,
      );
    }

    console.log(`Successfully updated scores for ${processedCount} entries.`);
  } catch (error) {
    console.error('Error recalculating scores:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
};

// Запуск скрипта, если файл вызывается напрямую
if (require.main === module) {
  recalculateScores()
    .then(() => {
      console.log('Score recalculation completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Score recalculation failed:', error);
      process.exit(1);
    });
}

export { recalculateScores };
