import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

import { DATABASE_CONFIG } from '../../configs/database';

const sequelize = new Sequelize(DATABASE_CONFIG);

interface MRReportTagAttributes {
  id: number;
  code: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

type MRReportTagCreationAttributes = Optional<
  MRReportTagAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

export class MRReportTag
  extends Model<MRReportTagAttributes, MRReportTagCreationAttributes>
  implements MRReportTagAttributes
{
  public id!: number;
  public code!: string;
  public description!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

MRReportTag.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 50],
      },
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 4095],
      },
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
    tableName: 'mr_report_tags',
    timestamps: true,
    indexes: [{ fields: ['code'], name: 'idx_mr_report_tags_code', unique: true }],
  },
);
