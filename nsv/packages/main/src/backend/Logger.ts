import type { Client } from './protocol/Client';
import _ from 'lodash';
import { v4 } from 'uuid';
import { configFolder } from './Db';
import fs from 'node:fs';
import path from 'node:path';
import { formatLog } from '../../../../shared/formatLogs';

export type LogType = 'command' | 'feedback' | 'system';
export type LogParams = { type: LogType; text: string } & (
  { type: 'command'; targets: Client[] }
  | { type: 'feedback'; sender: Client; }
  | { type: 'system'; targets?: Client[] }
);
export type LogBase = { text: string; time: Date; uuid: string };
export type Log = LogBase & (
  { type: 'command'; targetIds: number[] }
  | { type: 'feedback'; senderId: number; }
  | { type: 'system'; targetIds?: number[] }
);
type ClientLogFunction = (params: Log) => unknown;

function getDateFormatted(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const yyyy = date.getFullYear();

  return `${dd}.${mm}.${yyyy}`;
}
// function parseFormattedDate(dateStr: string): Date | null {
//   const [dd, mm, yyyy] = dateStr.split('.').map(Number);

//   if (
//     !Number.isInteger(dd) || dd < 1 || dd > 31 ||
//     !Number.isInteger(mm) || mm < 1 || mm > 12 ||
//     !Number.isInteger(yyyy) || yyyy < 1000
//   )
//     return null;

//   // Months are 0-based in JS
//   return new Date(yyyy, mm - 1, dd);
// }

export class Logger {
  #logCommand: ClientLogFunction;
  #activeJournal?: { path: string; stream: fs.WriteStream };
  #getClients: () => Client[];
  logs: Log[];
  folder: string;
  constructor(clientLogFunction: ClientLogFunction, getClients: () => Client[], folder = path.join(configFolder, 'logs')) {
    this.#logCommand = clientLogFunction;
    this.folder = folder;
    this.#getClients = getClients;
    this.getCurrentJournal();

    fs.mkdirSync(folder, { recursive: true });
    this.logs = this.importLogs();
  }

  importLogs(period: [Date, Date] = [
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date(),
  ]) {
    const logs: Log[] = [];
    const [start, end] = period;
    const current = new Date(start);

    while (current <= end) {
      const filename = `${getDateFormatted(current)}.log`;
      const filepath = path.join(this.folder, filename);

      if (fs.existsSync(filepath)) {
        try {
          const content = fs.readFileSync(filepath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              const log = JSON.parse(line) as Omit<Log, 'time'> & { time: string };
              logs.push({ ...log, time: new Date(log.time) } as Log);
            } catch (err) {
              console.warn(`Invalid JSON in ${filename}: ${line}`);
            }
          }
        } catch (err) {
          console.error(`Failed to read log file ${filepath}:`, err);
        }
      }

      // Increment date by 1 day
      current.setDate(current.getDate() + 1);
    }
    return logs;
  }
  getCurrentJournal() {
    if (this.#activeJournal) {
      if (path.parse(this.#activeJournal.path).name === getDateFormatted())
        return this.#activeJournal;
      this.#activeJournal.stream.close();
    }
    const logPath = path.join(this.folder, `${getDateFormatted()}.log`);
    return this.#activeJournal = { path: logPath, stream: fs.createWriteStream(logPath, { encoding: 'utf-8', flags: 'a' }) };
  }

  log(params: LogParams & { toSTDIO?: boolean }): void {
    const toSTDIO = params.toSTDIO ?? true;
    const { text } = params;

    const base: LogBase = { time: new Date(), text, uuid: v4() };
    let log: Log;
    switch (params.type) {
      case 'feedback':
        log = { ...base, type: params.type, senderId: params.sender?.public.id };
        break;
      case 'command':
        log = { ...base, type: params.type, targetIds: params.targets.map(t => t.public.id) };
        break;
      case 'system':
        log = { ...base, type: params.type, targetIds: params.targets?.map(t => t.public.id) };
        break;
    }
    if (toSTDIO)
      console.log(formatLog(log, this.#getClients().map(c => c.public)).join(' '));

    this.logs.push(log);
    this.#logCommand(log);
    this.getCurrentJournal().stream.write(`${JSON.stringify(log)}\n`);
  }
}