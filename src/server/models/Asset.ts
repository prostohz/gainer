import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

import { PATH } from '../configs/database';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: PATH,
  logging: false,
});

interface AssetAttributes {
  id: number;
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision: number;
  quoteAssetPrecision: number;
  baseCommissionPrecision: number;
  quoteCommissionPrecision: number;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  pricePrecision: number;
  volumePrecision: number;
  volume: number;
  quoteVolume: number;
  usdtVolume: number;
}

type AssetCreationAttributes = Optional<AssetAttributes, 'id'>;

export class Asset
  extends Model<AssetAttributes, AssetCreationAttributes>
  implements AssetAttributes
{
  public id!: number;
  public symbol!: string;
  public status!: string;
  public baseAsset!: string;
  public quoteAsset!: string;
  public baseAssetPrecision!: number;
  public quoteAssetPrecision!: number;
  public baseCommissionPrecision!: number;
  public quoteCommissionPrecision!: number;
  public isSpotTradingAllowed!: boolean;
  public isMarginTradingAllowed!: boolean;
  public lastPrice!: number;
  public priceChange!: number;
  public priceChangePercent!: number;
  public pricePrecision!: number;
  public volumePrecision!: number;
  public volume!: number;
  public quoteVolume!: number;
  public usdtVolume!: number;
}

Asset.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    baseAsset: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quoteAsset: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    baseAssetPrecision: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quoteAssetPrecision: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    baseCommissionPrecision: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quoteCommissionPrecision: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isSpotTradingAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isMarginTradingAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    lastPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    priceChange: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    priceChangePercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    pricePrecision: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    volumePrecision: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    volume: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    quoteVolume: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    usdtVolume: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'assets',
    timestamps: false,
    indexes: [{ fields: ['symbol'], name: 'idx_assets_symbol', unique: true }],
  },
);

Asset.sync();
