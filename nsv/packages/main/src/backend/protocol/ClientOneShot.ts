import type { Commands, IUser } from '$types/Common';
import type { Socket } from 'net';
import { ActionMessage } from './Message';
import { MessageReader } from './MessageReader';
import InputQueue from './InputQueue';
import _ from 'lodash';
import { Action } from '../common-types';
import type { ClientContainer, OnMessageHook, CommandQueueEntry, AnyClass } from './Client';

export class ClientOneShot implements ClientContainer {
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
      id: 1,
      address: socket?.remoteAddress?.replaceAll('::ffff:', '') || '',
      connected: true,
      online: true,
      processing: false,
      streaming: false,
    };
    socket && this.onReconnect(socket);
  }

  #handler?: (data: Buffer) => Promise<unknown>;
  dispose() {
    if (this.#handler)
      this.#socket?.removeListener('data', this.#handler);
    this.#reader?.cleanup();
    this.#onMessage = [];
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

    this.#handler = async (data: Buffer) => {
      if (!this.#reader)
        throw new Error('No reader?!');
      await this.#reader.read(data, async message => {
        if (!(message instanceof ActionMessage) || message.action !== Action.HANDSHAKE) {
          console.log(message);
          this.dispose();
          this.close();
          throw new Error('Attempting to call to action before handshake');
        }
        for (const listener of this.#onMessage)
          await message instanceof listener[0] && listener[1](message);
      });
    };
    this.#socket.on('data', this.#handler);
  }
  close() {
    this.#socket?.end();
  }
  on<T extends AnyClass, U extends ActionMessage<Action.HANDSHAKE>>(_event: 'message', type: T, hook: OnMessageHook<U>) {
    this.#onMessage.push([type, hook as OnMessageHook]);
  }
}