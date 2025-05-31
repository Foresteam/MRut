import type { Socket } from 'net';
import { Client } from './Client';
import type { IUser, IUserHandshake } from '$types/Common';
import { ActionMessage } from './Message';
import * as commands from '../commands';
import { ClientOneShot } from './ClientOneShot';
import { Action } from '../common-types';
import _ from 'lodash';
import type { Logger } from '../Logger';
import type { TLSSocket } from 'node:tls';
import tls from 'node:tls';
import { configFolder } from '../Db';
import path from 'node:path';
import fs from 'node:fs';

export class SecureServer {
  #bindClient: (client: Client) => void;
  #onModifyUser: (client: Client, update: Partial<IUser>) => void;
  #logger: Logger;

  constructor(logger: Logger, onModifyUser: (client: Client, update: Partial<IUser>) => void, bindClient: (client: Client) => void) {
    this.#bindClient = bindClient;
    this.#logger = logger;
    this.#onModifyUser = onModifyUser;
  }

  async performHandshake(client: Client, handshake: IUserHandshake) {
    try {
      client.public.hostname = handshake.hostname;
      client.public.startTimeMs = handshake.timestampMs;
      client.public.diffTimeMs = Date.now() - handshake.timestampMs;
      client.public.username = handshake.username;
      client.public.hwid = handshake.hwid;

      this.#onModifyUser(client, _.pick(client.public, ['hostname', 'startTimeMs', 'diffTimeMs', 'username']));
      await client.sendMessage(JSON.stringify({}));
      this.#logger.log({ type: 'system', text: 'Client connected', targets: [client] });
    }
    catch (e) {
      console.error('Handshake failed');
      throw e;
    }
  }

  #bindActualClient(client: Client) {
    this.#bindClient(client);
  }
  #handleConnection(socket: Socket) {
    // socket.setNoDelay(true);
    let client: Client;

    const oneShot = new ClientOneShot(socket);
    oneShot.on('message', ActionMessage, async (message: ActionMessage) => {
      const [code, data] = [message.action, message.data];

      if (code !== Action.HANDSHAKE)
        throw new Error('Action before handshake: aborted');
      oneShot.dispose();

      const handshake: IUserHandshake = JSON.parse(data.toString('utf-8'));
      const existingClient = commands.clients.find(v => v.public.hwid == handshake.hwid);
      if (existingClient) {
        client = existingClient;
        client.onReconnect(socket);
      }
      else {
        client = new Client(socket);
        commands.clients.push(client);
      }

      this.#bindActualClient(client);
      await this.performHandshake(client, handshake);
    });

    const setClientOffline = (e: Error | null) => {
      if (e)
        console.error(e);
      client.public.online = false;
      this.#onModifyUser(client, { online: client.public.online });
      this.#logger.log({ type: 'system', text: 'Client lost connection', targets: [client] });
    };
    socket.on('error', setClientOffline);
    socket.on('close', setClientOffline);
  }

  #handleTLS(socket: TLSSocket) {
    socket.setNoDelay(true);

    const tempErrorHandler = (err: Error) =>
      this.#logger.log({ type: 'system', text: `${err}` });
    socket.on('error', tempErrorHandler);
    socket.once('secureConnect', () => {
      this.#handleConnection(socket);
      socket.removeListener('error', tempErrorHandler);
    });
  }

  start() {
    const server = tls.createServer({
      key: fs.readFileSync(path.join(configFolder, 'server.key')),
      cert: fs.readFileSync(path.join(configFolder, 'server.crt')),
      minVersion: 'TLSv1.3',
    }, socket => this.#handleTLS(socket));
    server.listen(1337);
    this.#logger.log({ text: 'Server started', type: 'system' });
  }
}