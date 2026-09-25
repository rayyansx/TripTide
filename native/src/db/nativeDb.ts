import * as SQLite from 'expo-sqlite';

/**
 * Schema stub mirroring the table shapes in client/src/db/offlineDb.ts
 * (Trip/Day/Place rows are already DB-agnostic plain objects — see the
 * shared Zod schemas).
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
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY,
          trip_id INTEGER NOT NULL,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY,
          trip_id INTEGER NOT NULL,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS packing (
          id INTEGER PRIMARY KEY,
          trip_id INTEGER NOT NULL,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS mutationQueue (
          id TEXT PRIMARY KEY,
          trip_id INTEGER,
          status TEXT NOT NULL,
          data TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}
