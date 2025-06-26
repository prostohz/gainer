import { DataTypes, Model, Sequelize } from 'sequelize';

import { DATABASE_CONFIG } from '../configs/database';

const sequelize = new Sequelize(DATABASE_CONFIG);

interface TradeAttributes {
  symbol: string;
  tradeId: number;
  price: string;
  quantity: string;
  firstTradeId: number;
  lastTradeId: number;
  timestamp: number;
  isBuyerMaker: boolean;
  isBestPriceMatch: boolean;
}

type TradeCreationAttributes = TradeAttributes;

export class Trade
  extends Model<TradeAttributes, TradeCreationAttributes>
  implements TradeAttributes
{
  public symbol!: string;
  public tradeId!: number;
  public price!: string;
  public quantity!: string;
  public firstTradeId!: number;
  public lastTradeId!: number;
  public timestamp!: number;
  public isBuyerMaker!: boolean;
  public isBestPriceMatch!: boolean;
}

Trade.init(
  {
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tradeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstTradeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lastTradeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    isBuyerMaker: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isBestPriceMatch: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'trades',
    timestamps: false,
    indexes: [
      {
        fields: ['symbol', 'tradeId'],
        name: 'idx_trades_symbol_tradeId',
      },
      { fields: ['symbol', 'timestamp'], name: 'idx_trades_symbol_timestamp' },
    ],
  },
);
