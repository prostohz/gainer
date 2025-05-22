import Database from 'better-sqlite3';

import { TTimeframe, TCandle } from '../../../trading/types';
import { DB_PATH } from '../configs/db';

export class CandleRepository {
  private static instance: CandleRepository;

  private db: Database.Database;

  private constructor() {
    this.db = new Database(DB_PATH);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS candles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        openTime INTEGER NOT NULL,
        closeTime INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        numberOfTrades INTEGER NOT NULL,
        volume REAL NOT NULL,
        quoteAssetVolume REAL NOT NULL,
        takerBuyBaseAssetVolume REAL NOT NULL,
        takerBuyQuoteAssetVolume REAL NOT NULL,
        UNIQUE(symbol, timeframe, openTime)
      )
    `);

    // Индекс для быстрого поиска по символу
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_candles_symbol ON candles(symbol)`);

    // Индекс для быстрого поиска по таймфрейму
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_candles_timeframe ON candles(timeframe)`);

    // Составной индекс для часто используемых комбинаций полей в запросах
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_candles_symbol_timeframe ON candles(symbol, timeframe)`,
    );

    // Индекс для сортировки по времени открытия
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_candles_openTime ON candles(openTime)`);

    // Составной индекс для часто используемых комбинаций полей в запросах
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_candles_symbol_timeframe_openTime ON candles(symbol, timeframe, openTime)`,
    );
  }

  public static getInstance(): CandleRepository {
    if (!CandleRepository.instance) {
      CandleRepository.instance = new CandleRepository();
    }
    return CandleRepository.instance;
  }

  public saveCandles(symbol: string, timeframe: TTimeframe, candles: TCandle[]) {
    const insertCandle = this.db.prepare(`
      INSERT OR REPLACE INTO candles (
        symbol, timeframe, openTime, open, high, low, close, volume, 
        closeTime, quoteAssetVolume, numberOfTrades, 
        takerBuyBaseAssetVolume, takerBuyQuoteAssetVolume
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((candles) => {
      for (const candle of candles) {
        insertCandle.run(
          symbol,
          timeframe,
          candle.openTime,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume,
          candle.closeTime,
          candle.quoteAssetVolume,
          candle.numberOfTrades,
          candle.takerBuyBaseAssetVolume,
          candle.takerBuyQuoteAssetVolume,
        );
      }
    });

    transaction(candles);
  }

  public getCandles(
    symbol: string,
    timeframe: TTimeframe,
    limit: number = 1000,
    order: 'ASC' | 'DESC' = 'ASC',
  ): TCandle[] {
    const result = this.db
      .prepare(
        `SELECT * FROM candles WHERE symbol = ? AND timeframe = ? ORDER BY openTime ${order} LIMIT ?`,
      )
      .all(symbol, timeframe, limit) as TCandle[];

    return result;
  }

  public deleteCandle(symbol: string, timeframe: TTimeframe, openTime: number) {
    this.db
      .prepare(`DELETE FROM candles WHERE symbol = ? AND timeframe = ? AND openTime = ?`)
      .run(symbol, timeframe, openTime);
  }
}
