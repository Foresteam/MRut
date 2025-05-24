import type { Commands, IUser } from '$types/Common';
import type { Socket } from 'net';
import type { Message } from './Message';
import { MessageReader } from './MessageReader';
import InputQueue from './InputQueue';
import _ from 'lodash';
import * as db from '../Db';

let idCounter = 0;
type OnMessageHook<T extends Message = Message> = (message: T) => Promise<void> | void;
type CommandQueueEntry = string | Buffer | (() => unknown | Promise<unknown>);
type AnyClass = new (...args: any[]) => any;
export class Client implements db.Serializable<IUser> {
  readonly inputQueue: InputQueue;
  netQueue: { queuedCommandId: number, command: keyof Commands | undefined, queue: (CommandQueueEntry | CommandQueueEntry[])[] }[];
  public: IUser;
  #socket: Socket | null;

  #reader: MessageReader | undefined;
  #onMessage: [AnyClass, OnMessageHook][];

  constructor(socket?: Socket) {
    this.netQueue = [];
    this.#socket = socket ?? null;
    this.#onMessage = [];
    this.inputQueue = new InputQueue(this);
    this.public = {
      id: idCounter++,
      address: socket?.remoteAddress?.replaceAll('::ffff:', '') || '',
      connected: true,
      online: true,
      processing: false,
      streaming: false,
    };
    socket && this.onReconnect(socket);
  }
  onReconnect(socket: Socket) {
    this.#socket = socket;
    this.public.online = true;
    /// @todo re-make
    this.public.streaming = false;
    this.#onMessage = [];
    if (this.#reader)
      this.#reader.cleanup();
    this.#reader = new MessageReader();
    this.#socket.on('data', async data => {
      if (!this.#reader)
        throw new Error('No reader?!');
      await this.#reader.read(data, async message => {
        for (const listener of this.#onMessage)
          await message instanceof listener[0] && listener[1](message);
      });
    });
  }
  close() {
    if (!this.#socket)
      throw new Error(`Socket was never loaded: ${JSON.stringify(this.public)}`);
    this.#socket.end();
  }
  sendMessage(data: string | Buffer): void {
    if (!this.#socket)
      throw new Error(`Socket was never loaded: ${JSON.stringify(this.public)}`);
    const buf = data ? Uint8Array.from(data instanceof Buffer ? data : Buffer.from(data, 'utf-8')) : new Uint8Array([0]);
    // mb Buffer.byteLength()?
    const sizeBuf = Buffer.alloc(8);
    sizeBuf.writeBigUInt64LE(BigInt(buf.length));
    this.#socket.write(new Uint8Array(sizeBuf));
    this.#socket.write(buf);
  }
  on<T extends AnyClass, U extends Message>(_event: 'message', type: T, hook: OnMessageHook<U>) {
    this.#onMessage.push([type, hook as OnMessageHook]);
  }
  expectFile(name: string) {
    if (!this.#reader)
      throw new Error('No reader?!');
    this.#reader.expectFile(name);
  }
  expectBinary() {
    if (!this.#reader)
      throw new Error('No reader?!');
    this.#reader.expectBinary();
  }

  static setIdCounter(value: number) {
    idCounter = value;
  }
  static deserialize(data: IUser) {
    const client = new Client();
    Object.assign(client.public, { ...data, online: false, streaming: false, processing: false } satisfies IUser);
    return client;
  }
  serialize() {
    return _.cloneDeep(this.public);
  }
  save() {
    db.set('Client', this.public.id.toString(), this.serialize());
  }

  static loadAll() {
    const clientsData = db.getAll<IUser>('Client').map(v => v[1]);
    const clients = _.sortBy(clientsData.map(data => Client.deserialize(data)), client => client.public.id);
    const maxIndex = clients.at(-1)?.public.id;
    if (maxIndex !== undefined)
      Client.setIdCounter(maxIndex + 1);
    return clients;
  }
}
/** @brief Typecheck */
<db.SerializableStatic<IUser, Client>>Client;