import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";

export type Database = Database.Database;

export function openDatabase(path?: string): Database {
  const dbPath = path ?? fileURLToPath(new URL("../data/sprinters.db", import.meta.url));
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS routines (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id            TEXT PRIMARY KEY,
      routine_id    TEXT NOT NULL,
      exercise_id   TEXT NOT NULL,
      sets          INTEGER NOT NULL CHECK (sets > 0),
      reps          INTEGER NOT NULL CHECK (reps > 0),
      position      INTEGER NOT NULL,
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine
      ON routine_exercises(routine_id);
  `);
}
