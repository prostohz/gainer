import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

import { DATABASE_CONFIG } from '../configs/database';

const sequelize = new Sequelize(DATABASE_CONFIG);

interface CandleAttributes {
  id: number;
  symbol: string;
  timeframe: string;
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  numberOfTrades: number;
  volume: string;
  quoteAssetVolume: string;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

type CandleCreationAttributes = Optional<CandleAttributes, 'id'>;

export class Candle
  extends Model<CandleAttributes, CandleCreationAttributes>
  implements CandleAttributes
{
  public id!: number;
  public symbol!: string;
  public timeframe!: string;
  public openTime!: number;
  public closeTime!: number;
  public open!: string;
  public high!: string;
  public low!: string;
  public close!: string;
  public numberOfTrades!: number;
  public volume!: string;
  public quoteAssetVolume!: string;
  public takerBuyBaseAssetVolume!: string;
  public takerBuyQuoteAssetVolume!: string;
}

Candle.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timeframe: {
      type: DataTypes.STRING,
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
    open: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    high: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    low: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    close: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numberOfTrades: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    volume: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quoteAssetVolume: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    takerBuyBaseAssetVolume: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    takerBuyQuoteAssetVolume: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'candles',
    timestamps: false,
    indexes: [
      {
        fields: ['symbol', 'timeframe', 'openTime'],
        name: 'idx_candles_symbol_timeframe_openTime',
        unique: true,
      },
    ],
  },
);
