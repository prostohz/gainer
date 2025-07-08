import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

import { DATABASE_CONFIG } from '../../configs/database';

const sequelize = new Sequelize(DATABASE_CONFIG);

interface MRReportAttributes {
  id: number;
  reportId: string;
  date: number;
  tagId: number;
  lastBacktestAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type MRReportCreationAttributes = Optional<
  MRReportAttributes,
  'id' | 'lastBacktestAt' | 'createdAt' | 'updatedAt'
>;

export class MRReport
  extends Model<MRReportAttributes, MRReportCreationAttributes>
  implements MRReportAttributes
{
  public id!: number;
  public reportId!: string;
  public date!: number;
  public tagId!: number;
  public lastBacktestAt!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Связанные данные
  public pairs?: import('./MRReportPair').MRReportPair[];
  public backtestTrades?: import('./MRReportBacktestTrade').MRReportBacktestTrade[];
  public tag?: import('./MRReportTag').MRReportTag;
}

MRReport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reportId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.BIGINT,
      allowNull: false,
      get() {
        const value = this.getDataValue('date');
        return typeof value === 'string' ? parseInt(value, 10) : value;
      },
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'mr_report_tags',
        key: 'id',
      },
    },
    lastBacktestAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'mr_reports',
    timestamps: true,
    indexes: [
      { fields: ['reportId'], name: 'idx_mr_reports_report_id' },
      { fields: ['date'], name: 'idx_mr_reports_date' },
      { fields: ['tagId'], name: 'idx_mr_reports_tag_id' },
      { fields: ['reportId', 'tagId'], name: 'idx_mr_reports_report_id_tag_id', unique: true },
    ],
  },
);
