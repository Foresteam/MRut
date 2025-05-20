import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const tables = ['Client'] as const;
export type Table = typeof tables[number];

// Resolve %APPDATA% path (cross-platform)
const appData = process.env.APPDATA ||
  (process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support')
    : path.join(os.homedir(), '.config'));
const configFolder = path.join(appData, 'MRut');
fs.mkdirSync(configFolder, { recursive: true });
export { configFolder };

const db = new Database(path.join(configFolder, 'db.sqlite'));
db.pragma('journal_mode = WAL');
for (const table of tables)
  db.prepare(`CREATE TABLE IF NOT EXISTS ${table} (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT
  )`)
    .run();
export const _db = db;

export function set(table: Table, key: string, value: string | number | boolean | object) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (key, value) VALUES (?, ?)`).run(key, JSON.stringify(value));
}

// Get a value
export function get(table: Table, key: string) {
  const row = db.prepare(`SELECT value FROM ${table} WHERE key = ?`).get(key) as { value: string } | null;
  try {
    return JSON.parse(row?.value || 'null') as string | number | boolean | object | null;
  }
  catch {
    return null;
  }
}
export function getAll(table: Table) {
  const rows = db.prepare(`SELECT key, value FROM ${table}`).all() as { key: string; value: string }[];
  return rows.map(({ key, value }) => {
    try {
      return [key, JSON.parse(value) as string | number | boolean | object] as const;
    }
    catch {
      return null;
    }
  }).filter(v => !!v);
}

export interface Serializable<T> {
  serialize(): T;
  save(): void;
}
export interface SerializableStatic<T, U> {
  setIdCounter(value: number): void;
  deserialize(data: T): U;
  loadAll(): U[];
}