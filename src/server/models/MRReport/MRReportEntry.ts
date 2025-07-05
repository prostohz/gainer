import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

import { DATABASE_CONFIG } from '../../configs/database';

const sequelize = new Sequelize(DATABASE_CONFIG);

interface MRReportEntryAttributes {
  id: number;
  reportId: number;
  assetABaseAsset: string;
  assetAQuoteAsset: string;
  assetBBaseAsset: string;
  assetBQuoteAsset: string;
  pValue: number;
  halfLife: number;
  correlationByPrices: number;
  correlationByReturns: number;
  crossings: number;
  spreadMean: number;
  spreadMedian: number;
  spreadStd: number;
}

type MRReportEntryCreationAttributes = Optional<MRReportEntryAttributes, 'id'>;

export class MRReportEntry
  extends Model<MRReportEntryAttributes, MRReportEntryCreationAttributes>
  implements MRReportEntryAttributes
{
  public id!: number;
  public reportId!: number;
  public assetABaseAsset!: string;
  public assetAQuoteAsset!: string;
  public assetBBaseAsset!: string;
  public assetBQuoteAsset!: string;
  public pValue!: number;
  public halfLife!: number;
  public correlationByPrices!: number;
  public correlationByReturns!: number;
  public crossings!: number;
  public spreadMean!: number;
  public spreadMedian!: number;
  public spreadStd!: number;
}

MRReportEntry.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'mr_reports',
        key: 'id',
      },
    },
    assetABaseAsset: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetAQuoteAsset: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetBBaseAsset: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetBQuoteAsset: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pValue: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    halfLife: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    correlationByPrices: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    correlationByReturns: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    crossings: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    spreadMean: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    spreadMedian: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    spreadStd: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'mr_report_entries',
    timestamps: false,
    indexes: [{ fields: ['reportId'], name: 'idx_mr_report_entries_report_id' }],
  },
);
