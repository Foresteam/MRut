import type { Client } from './protocol/Client';
import _ from 'lodash';
import { v4 } from 'uuid';
import { configFolder } from './Db';
import fs from 'node:fs';
import path from 'node:path';

export type LogParams = { sender?: null | Client; isMe?: boolean; text: string };
export type Log = { isMe?: boolean; text: string; time: Date; senderId: number | null; uuid: string };
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
  logs: Log[];
  folder: string;
  constructor(clientLogFunction: ClientLogFunction, folder = path.join(configFolder, 'logs')) {
    this.#logCommand = clientLogFunction;
    this.folder = folder;
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
              const log = JSON.parse(line);
              logs.push(log);
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

  log(text: string, { sender = null as null | Client, isMe = false, toSTDIO = true } = {}): void {
    let time = new Date().toTimeString();
    time = time.substring(0, time.indexOf(' GMT'));
    if (toSTDIO)
      console.log(`[${time}${isMe ? '' : ` ${sender?.public.name || sender?.public.hostname}#${sender?.public.id}`}] ${text.split('\n').join('\n\t')}`);

    const log: Log = { time: new Date(), text, isMe, senderId: sender?.public.id ?? null, uuid: v4() };
    this.logs.push(log);
    this.#logCommand(log);
    this.getCurrentJournal().stream.write(`${JSON.stringify(log)}\n`);
  }
}