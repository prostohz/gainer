import { MRReport } from './MRReport';
import { MRReportEntry } from './MRReportEntry';
import { MRReportBacktestTrade } from './MRReportBacktestTrade';
import { MRReportTag } from './MRReportTag';

MRReport.hasMany(MRReportEntry, {
  foreignKey: 'reportId',
  as: 'entries',
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

MRReportEntry.belongsTo(MRReport, {
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

export { MRReport, MRReportEntry, MRReportBacktestTrade, MRReportTag };
