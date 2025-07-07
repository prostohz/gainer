import { Sequelize } from 'sequelize';

import { DATABASE_CONFIG } from '../../configs/database';
import { MRReportPair } from '../../models/MRReport/MRReportPair';
import { calculatePairScore } from './pairScore';

const sequelize = new Sequelize(DATABASE_CONFIG);

const recalculateScores = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    console.log('Fetching all MRReportPair records...');
    const pairs = await MRReportPair.findAll();
    console.log(`Found ${pairs.length} pairs to process.`);

    let processedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pairs.length / batchSize)}`,
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

        return MRReportPair.update({ score }, { where: { id: entry.id } });
      });

      await Promise.all(updates);
      processedCount += batch.length;

      console.log(
        `Processed ${processedCount}/${pairs.length} pairs (${((processedCount / pairs.length) * 100).toFixed(1)}%)`,
      );
    }

    console.log(`Successfully updated scores for ${processedCount} pairs.`);
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
