import Database from 'better-sqlite3';

import { TAsset } from '../services/assetService/types';
import { DB_PATH } from '../configs/db';

export class AssetRepository {
  private static instance: AssetRepository;

  private db: Database.Database;

  private constructor() {
    this.db = new Database(DB_PATH);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        status TEXT NOT NULL,
        baseAsset TEXT NOT NULL,
        quoteAsset TEXT NOT NULL,
        baseAssetPrecision INTEGER NOT NULL,
        quoteAssetPrecision INTEGER NOT NULL,
        baseCommissionPrecision INTEGER NOT NULL,
        quoteCommissionPrecision INTEGER NOT NULL,
        isSpotTradingAllowed INTEGER NOT NULL,
        isMarginTradingAllowed INTEGER NOT NULL,
        lastPrice TEXT NOT NULL,
        priceChange TEXT NOT NULL,
        priceChangePercent TEXT NOT NULL,
        precision INTEGER NOT NULL,
        volumePrecision INTEGER NOT NULL,
        volume REAL NOT NULL,
        quoteVolume REAL NOT NULL,
        usdtVolume REAL NOT NULL,
        UNIQUE(symbol)
      )
    `);
  }

  private formatToRow(asset: TAsset) {
    return {
      ...asset,
      isSpotTradingAllowed: asset.isSpotTradingAllowed ? 1 : 0,
      isMarginTradingAllowed: asset.isMarginTradingAllowed ? 1 : 0,
    };
  }

  private formatToAsset(row: TAsset) {
    return {
      ...row,
      isSpotTradingAllowed: Boolean(row.isSpotTradingAllowed),
      isMarginTradingAllowed: Boolean(row.isMarginTradingAllowed),
    };
  }

  public static getInstance(): AssetRepository {
    if (!AssetRepository.instance) {
      AssetRepository.instance = new AssetRepository();
    }
    return AssetRepository.instance;
  }

  public saveAssets(assets: TAsset[]) {
    const insertAsset = this.db.prepare(`
      INSERT INTO assets (
        symbol, status, baseAsset, quoteAsset, baseAssetPrecision, quoteAssetPrecision, 
        baseCommissionPrecision, quoteCommissionPrecision, isSpotTradingAllowed, isMarginTradingAllowed, 
        lastPrice, priceChange, priceChangePercent, precision, volumePrecision, volume, quoteVolume, usdtVolume
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((assets) => {
      for (const asset of assets) {
        const row = this.formatToRow(asset);

        insertAsset.run(
          row.symbol,
          row.status,
          row.baseAsset,
          row.quoteAsset,
          row.baseAssetPrecision,
          row.quoteAssetPrecision,
          row.baseCommissionPrecision,
          row.quoteCommissionPrecision,
          row.isSpotTradingAllowed,
          row.isMarginTradingAllowed,
          row.lastPrice,
          row.priceChange,
          row.priceChangePercent,
          row.precision,
          row.volumePrecision,
          row.volume,
          row.quoteVolume,
          row.usdtVolume,
        );
      }
    });

    transaction(assets);
  }

  public getAsset(symbol: string): TAsset | null {
    const record = this.db.prepare('SELECT * FROM assets WHERE symbol = ?').get(symbol) as TAsset;
    if (!record) {
      return null;
    }

    return this.formatToAsset(record);
  }

  public getAssets(): TAsset[] {
    const records = this.db.prepare('SELECT * FROM assets').all() as TAsset[];

    return records.map(this.formatToAsset);
  }

  public deleteAll() {
    this.db.prepare('DELETE FROM assets').run();
  }
}
