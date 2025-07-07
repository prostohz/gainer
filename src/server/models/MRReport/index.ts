import { MRReport } from './MRReport';
import { MRReportPair } from './MRReportPair';
import { MRReportBacktestTrade } from './MRReportBacktestTrade';
import { MRReportTag } from './MRReportTag';

MRReport.hasMany(MRReportPair, {
  foreignKey: 'reportId',
  as: 'pairs',
  onDelete: 'CASCADE',
});

MRReport.hasMany(MRReportBacktestTrade, {
  foreignKey: 'reportId',
  as: 'backtestTrades',
  onDelete: 'CASCADE',
});

MRReport.belongsTo(MRReportTag, {
  foreignKey: 'tagId',
  as: 'tag',
});

MRReportPair.belongsTo(MRReport, {
  foreignKey: 'reportId',
  as: 'report',
});

MRReportBacktestTrade.belongsTo(MRReport, {
  foreignKey: 'reportId',
  as: 'report',
});

MRReportTag.hasMany(MRReport, {
  foreignKey: 'tagId',
  as: 'reports',
});

export { MRReport, MRReportPair, MRReportBacktestTrade, MRReportTag };
