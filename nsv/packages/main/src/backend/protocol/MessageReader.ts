import { Action } from '../common-types';
import { constants } from 'buffer';
import * as fs from 'node:fs';
import type { Message } from './Message';
import { BinaryMessage, FileMessage, ActionMessage } from './Message';

export class MessageReader {
  #data: Buffer;
  #received?: bigint;
  #messageBodySize?: bigint;
  #outputFile?: string;
  #fileExpectations: string[];
  #expectation: 'action' | 'binary';
  #action?: Action;
  #fileStream?: fs.WriteStream;

  constructor() {
    this.#data = Buffer.alloc(0);
    this.#fileExpectations = [];
    this.#expectation = 'action';
  }

  isExpectingFile() {
    return !!this.#outputFile;
  }
  expectFile(name: string) {
    this.#fileExpectations.push(name);
  }
  expectBinary() {
    this.#expectation = 'binary';
  }
  async #onMessageEnd(data: Buffer, borderLength: number) {
    if (this.#received === undefined || this.#messageBodySize === undefined)
      throw new Error('Not received anything');

    if (this.#fileStream)
      await new Promise((resolve, reject) => this.#fileStream?.end(resolve) || reject());
    this.#fileStream = undefined;
    this.#outputFile = undefined;

    let nextBytes = 0;
    if (data.length > borderLength) {
      this.#data = Buffer.alloc(0); //data.subarray(borderLength);
      nextBytes = data.length - borderLength;
    }
    else
      this.#data = Buffer.alloc(0);
    this.#received = undefined;
    this.#messageBodySize = undefined;
    this.#expectation = 'action';

    // console.log('message end', 'data.length', data.length, 'borderLength', borderLength, 'nextBytes', nextBytes);
    return nextBytes;
  }

  /**
   * "Extrenally recurrent" read function, public for test purposes
   * @param data Streamed buffer 
   * @returns Message if read a complete one, null otherwise
   */
  async _read(data: Buffer, onMessage: (message: Message) => Promise<unknown> | unknown): Promise<number> {
    // console.log('incoming', data.length);
    const lengthLength = 8;
    const actionLength = (this.#expectation === 'binary' ? 0 : 1);
    const headerLength = lengthLength + actionLength;
    let bodyStartsAt = 0;
    // First receive: parse message length
    if (this.#messageBodySize === undefined) {
      bodyStartsAt = headerLength - this.#data.length;
      this.#data = Buffer.concat([new Uint8Array(this.#data), new Uint8Array(data)]);

      if (this.#data.length >= headerLength) {
        if (this.#fileExpectations.length)
          [this.#outputFile] = this.#fileExpectations.splice(0, 1);

        const messageBodySize = this.#data.readBigUInt64LE() - BigInt(actionLength);
        if (this.#expectation !== 'binary')
          this.#action = Number(this.#data.at(lengthLength)) as Action;
        this.#data = this.#data.subarray(headerLength);
        if (this.#outputFile)
          this.#fileStream = fs.createWriteStream(this.#outputFile);
        else if (this.#action === Action.FILE)
          throw new Error('Unexpected file (network stream aborted)');
        else if (messageBodySize > constants.MAX_LENGTH)
          throw new Error('Too long message for not file: ' + messageBodySize);
        else {
          this.#data = Buffer.alloc(Math.min(Number(messageBodySize), constants.MAX_LENGTH));
        }
        this.#received = 0n;
        this.#messageBodySize = messageBodySize;
      }
      else
        return 0;
    }
    if (!data || this.#received === undefined || (this.#action === undefined && this.#expectation !== 'binary'))
      throw new Error('Shouldn\'t have happened...');

    // Calculate how much we can write
    const remaining = Number(this.#messageBodySize - this.#received);
    const writeSize: number = Math.min(data.length - bodyStartsAt, remaining);
    const borderLength: number = writeSize + bodyStartsAt;

    // console.log('read something', {
    //   '#data': this.#data.length,
    //   data: data?.length,
    //   '#messageBodySize': this.#messageBodySize,
    //   headlessLength: data.length - bodyStartsAt,
    //   writeSize,
    //   '#outputFile': this.#outputFile,
    //   '#fileStream': !!this.#fileStream
    // });

    if (this.#fileStream) {
      await new Promise((resolve, reject) => this.#fileStream!.write(data.subarray(bodyStartsAt, bodyStartsAt + writeSize), err => err ? reject(err) : resolve(err)));
      this.#received += BigInt(writeSize);

      if (this.#received >= this.#messageBodySize) {
        const result = new FileMessage(this.#outputFile as string);
        await onMessage(result);
        return await this.#onMessageEnd(data, borderLength);
      }
    }
    else {
      if (this.#received < this.#data.length)
        this.#data.set(data.subarray(bodyStartsAt, bodyStartsAt + writeSize), Number(this.#received));
      this.#received += BigInt(writeSize);

      if (this.#received >= Number(this.#messageBodySize)) {
        const resultBuf = this.#data.subarray(0, Number(this.#received));
        // console.log('before message end', this.#data.length, data?.length, this.#received, this.#messageBodySize);
        if (this.#expectation === 'action') {
          await onMessage(new ActionMessage(resultBuf, this.#action as Exclude<Action, Action.FILE>));
          return await this.#onMessageEnd(data, borderLength);
        }
        else if (this.#expectation === 'binary') {
          await onMessage(new BinaryMessage(resultBuf));
          return await this.#onMessageEnd(data, borderLength);
        }
        else
          throw new Error(`Unexpected "${this.#expectation}" expected`);
      }
    }

    return 0;
  }
  /**
   * Reads messages from network stream
   * @param data Raw data from network stream
   * @param callback On complete Message read
   */
  async read(data: Buffer, callback: (message: Message) => unknown | Promise<unknown>) {
    for (let i = 0; i < 100; i++) {
      const nextMessageBytes = await this._read(data, callback);
      if (!nextMessageBytes)
        return;
      data = data.subarray(data.length - nextMessageBytes);
      if (!data.length)
        return;
    }
    throw new Error('Infinite loop');
  }

  async cleanup() {
    if (this.#fileStream && !this.#fileStream.destroyed)
      await new Promise(resolve => this.#fileStream!.end(resolve));
    if (this.#outputFile)
      fs.unlinkSync(this.#outputFile);
  }
}