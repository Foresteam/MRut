import type { Client } from './Client';

export default class InputQueue {
  #queue: { command: string; relativeDelay: number }[];
  #client: Client;
  #lastRelativeDelay: number;
  constructor(client: Client) {
    this.#queue = [];
    this.#client = client;
    this.#lastRelativeDelay = 0;
  }
  push(command: string) {
    if (this.#client.public.startTimeMs === undefined || this.#client.public.diffTimeMs === undefined)
      throw new Error('Attempting to control client inputs before handshake');
    const relativeDelay = Date.now() - this.#client.public.startTimeMs - this.#client.public.diffTimeMs;
    this.#queue.push({ command, relativeDelay: relativeDelay - this.#lastRelativeDelay < 10 ? 0 : relativeDelay });
    this.#lastRelativeDelay = relativeDelay;
  }
  flush() {
    const rs = this.#queue.splice(0, this.#queue.length).flatMap(({ command, relativeDelay }) => [command, relativeDelay ? `InputDelaySinceStart(${relativeDelay})` : ''].filter(v => !!v)).join(';');
    if (rs)
      console.log('wtff', rs, rs.length);
    return rs;
  }
}