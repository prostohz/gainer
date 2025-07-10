import { DataTypes, Model, Sequelize } from 'sequelize';

import { DATABASE_CONFIG } from '../configs/database';

const sequelize = new Sequelize(DATABASE_CONFIG);

interface TradeAttributes {
  symbol: string;
  price: string;
  timestamp: number;
}

type TradeCreationAttributes = TradeAttributes;

export class Trade
  extends Model<TradeAttributes, TradeCreationAttributes>
  implements TradeAttributes
{
  public symbol!: string;
  public price!: string;
  public timestamp!: number;
}

Trade.init(
  {
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'trades',
    timestamps: false,
    indexes: [
      { fields: ['symbol', 'timestamp'], name: 'idx_trades_symbol_timestamp', unique: true },
    ],
  },
);
