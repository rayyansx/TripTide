import * as SQLite from 'expo-sqlite';

/**
 * Schema stub mirroring the table shapes in client/src/db/offlineDb.ts
 * (Trip/Day/Place rows are already DB-agnostic plain objects — see the
 * shared Zod schemas). Not wired into the repo layer's writes yet: Phase 1
 * ships an online-first repo layer, and this file exists so Phase 2 (the
 * offline read-through cache + mutation queue port) has the tables ready
 * without another schema-design pass. Do not add a `mutationQueue` table
 * here until the queue algorithm itself is ported — an empty table with no
 * reader is worse than no table.
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | undefined;

export function getNativeDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('trek-offline.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS trips (
          id INTEGER PRIMARY KEY,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS days (
          id INTEGER PRIMARY KEY,
          trip_id INTEGER NOT NULL,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS places (
          id INTEGER PRIMARY KEY,
          trip_id INTEGER NOT NULL,
          data TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}
