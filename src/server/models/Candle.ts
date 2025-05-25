import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

import { PATH } from '../configs/database';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: PATH,
  logging: false,
});

interface CandleAttributes {
  id: number;
  symbol: string;
  timeframe: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  numberOfTrades: number;
  volume: number;
  quoteAssetVolume: number;
  takerBuyBaseAssetVolume: number;
  takerBuyQuoteAssetVolume: number;
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
  public open!: number;
  public high!: number;
  public low!: number;
  public close!: number;
  public numberOfTrades!: number;
  public volume!: number;
  public quoteAssetVolume!: number;
  public takerBuyBaseAssetVolume!: number;
  public takerBuyQuoteAssetVolume!: number;
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
    },
    closeTime: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    open: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    high: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    low: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    close: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    numberOfTrades: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    volume: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    quoteAssetVolume: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    takerBuyBaseAssetVolume: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    takerBuyQuoteAssetVolume: {
      type: DataTypes.FLOAT,
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

Candle.sync();
