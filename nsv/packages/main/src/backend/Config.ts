import * as db from './Db';

export type ConfigData = typeof Config.defaults;

export class Config implements ConfigData {
  static readonly table = 'Config';
  static readonly defaults = {
    language: 'en' as 'ru' | 'en',
  } as const;

  language!: ConfigData['language'];

  constructor() {
    for (const key of Object.keys(Config.defaults) as (keyof ConfigData)[]) {
      // Set default if not present
      db.setIfEmpty(Config.table, key, Config.defaults[key]);

      // Define getter/setter for each field
      Object.defineProperty(this, key, {
        configurable: true,
        enumerable: true,
        get: () => db.get(Config.table, key),
        set: (value) => db.set(Config.table, key, value),
      });
    }
  }
  getData() {
    return Object.fromEntries(Object.keys(Config.defaults).map(key => [key, this[key as keyof ConfigData]])) as ConfigData;
  }
}