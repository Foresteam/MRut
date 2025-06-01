import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const tables = ['Client', 'Config'] as const;
export type Table = typeof tables[number];

// Resolve %APPDATA% path (cross-platform)
const appData = process.env.APPDATA ||
  (process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support')
    : path.join(os.homedir(), '.config'));
const configFolder = path.join(appData, 'MRut');
fs.mkdirSync(configFolder, { recursive: true });
export { configFolder };

export const db = new Database(path.join(configFolder, 'db.sqlite'));
db.pragma('journal_mode = WAL');
for (const table of tables)
  db.prepare(`CREATE TABLE IF NOT EXISTS ${table} (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
    .run();

export function set(table: Table, key: string, value: string | number | boolean | object) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (key, value) VALUES (?, ?)`).run(key, JSON.stringify(value));
}

// Get a value
export function get<T = string | number | boolean | object>(table: Table, key: string) {
  const row = db.prepare(`SELECT value FROM ${table} WHERE key = ?`).get(key) as { value: string } | null;
  try {
    return JSON.parse(row?.value || 'null') as T | null;
  }
  catch {
    return null;
  }
}
export function setIfEmpty(table: Table, key: string, value: string | number | boolean | object) {
  if (get(table, key) === null)
    set(table, key, value);
}
export function getAll<T = string | number | boolean | object>(table: Table) {
  const rows = db.prepare(`SELECT key, value FROM ${table}`).all() as { key: string; value: string }[];
  return rows.map(({ key, value }) => {
    try {
      return [key, JSON.parse(value) as T] as const;
    }
    catch {
      return null;
    }
  }).filter(v => !!v);
}
export function clear() {
  db.transaction(() => {
    for (const table of tables) {
      // Validate table name to prevent SQL injection
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(`Invalid table name: ${table}`);
      }
      db.prepare(`DELETE FROM ${table}`).run();
    }
  })();
}
/**
 * 
 * @param timeframe Time frame. Default to past week
 */
export function getAllOfTimeFrame<T = string | number | boolean | object>(
  table: Table,
  timeframe: [Date, Date] = [
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date(),
  ],
) {
  // Sanitize table name to avoid SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }

  const [from, to] = timeframe;

  const rows = db
    .prepare(
      `SELECT key, value FROM ${table} WHERE createdAt BETWEEN ? AND ?`,
    )
    .all(from.toISOString(), to.toISOString()) as {
      key: string;
      value: string;
    }[];

  return rows
    .map(({ key, value }) => {
      try {
        return [key, JSON.parse(value) as T] as const;
      } catch {
        return null;
      }
    })
    .filter((v): v is readonly [string, T] => !!v);
}

export interface Serializable<T> {
  serialize(): T;
  save(): void;
}
export interface SerializableStatic<T, U> {
  setIdCounter?(value: number): void;
  deserialize(data: T): U;
  loadAll(): U[];
}