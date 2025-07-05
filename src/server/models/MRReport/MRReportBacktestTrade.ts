import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

import { DATABASE_CONFIG } from '../../configs/database';

const sequelize = new Sequelize(DATABASE_CONFIG);

interface MRReportBacktestTradeAttributes {
  id: number;
  reportId: number;
  tradeId: number;
  direction: string;
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
}

type MRReportBacktestTradeCreationAttributes = Optional<MRReportBacktestTradeAttributes, 'id'>;

export class MRReportBacktestTrade
  extends Model<MRReportBacktestTradeAttributes, MRReportBacktestTradeCreationAttributes>
  implements MRReportBacktestTradeAttributes
{
  public id!: number;
  public reportId!: number;
  public tradeId!: number;
  public direction!: string;
  public symbolA!: string;
  public symbolB!: string;
  public quantityA!: number;
  public quantityB!: number;
  public openPriceA!: number;
  public closePriceA!: number;
  public openPriceB!: number;
  public closePriceB!: number;
  public openTime!: number;
  public closeTime!: number;
  public roi!: number;
  public openReason!: string;
  public closeReason!: string;
}

MRReportBacktestTrade.init(
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
    tradeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    direction: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    symbolA: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    symbolB: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantityA: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    quantityB: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    openPriceA: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    closePriceA: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    openPriceB: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    closePriceB: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    openTime: {
      type: DataTypes.BIGINT,
      allowNull: false,
      get() {
        const value = this.getDataValue('openTime');
        return typeof value === 'string' ? parseInt(value, 10) : value;
      },
    },
    closeTime: {
      type: DataTypes.BIGINT,
      allowNull: false,
      get() {
        const value = this.getDataValue('closeTime');
        return typeof value === 'string' ? parseInt(value, 10) : value;
      },
    },
    roi: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    openReason: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    closeReason: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'mr_report_backtest_trades',
    timestamps: false,
    indexes: [
      { fields: ['reportId'], name: 'idx_mr_report_backtest_trades_report_id' },
      { fields: ['tradeId'], name: 'idx_mr_report_backtest_trades_trade_id' },
    ],
  },
);
