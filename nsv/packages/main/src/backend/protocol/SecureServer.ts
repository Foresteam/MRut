import type { Socket } from 'net';
import { Client } from './Client';
import type { IUser, IUserHandshake } from '$types/Common';
import { ActionMessage } from './Message';
import * as commands from '../commands';
import { ClientOneShot } from './ClientOneShot';
import { Action } from '../common-types';
import _ from 'lodash';
import type { Logger } from '../Logger';
import tls from 'node:tls';
import { Certificates } from '../Certififaces';
import { en } from '../../../../../types/Locales';

export class SecureServer {
  #bindClient: (client: Client) => void;
  #onModifyUser: (client: Client, update: Partial<IUser>) => void;
  #logger: Logger;
  #server?: tls.Server;

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
      client.public.uuid = handshake.uuid;

      if (client.public.verified === false) {
        await new Promise<void>(resolve => setTimeout(resolve, 15000));
        client.close();
        return;
      }
      const updatedFields: (keyof IUser)[] = ['hostname', 'startTimeMs', 'diffTimeMs', 'username', 'hwid', 'uuid'];
      if (client.public.verified === undefined) {
        if (!client.public.pendingVerification) {
          client.public.pendingVerification = true;
          this.#onModifyUser(client, _.pick(client.public, [...updatedFields, 'pendingVerification']));
        }
        await new Promise<void>(resolve => setTimeout(resolve, 5000));
        client.close();
        return;
      }

      this.#onModifyUser(client, _.pick(client.public, updatedFields));
      await client.sendMessage(JSON.stringify({}));
      this.#logger.log({ type: 'system', text: en.serverLogs.clientConnected, targets: [client] });
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
      const existingClient = commands.clients.find(v => v.public.uuid == handshake.uuid);
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
      if (!client.public.online)
        return;
      if (e)
        console.error(e);
      if (!client)
        return;
      client.public.online = false;
      this.#onModifyUser(client, { online: client.public.online });
      this.#logger.log({ type: 'system', text: en.serverLogs.clientDisconnected, targets: [client], STDIOOnly: client.public.verified === false });
    };
    socket.on('error', setClientOffline);
    socket.on('close', setClientOffline);
  }

  async start() {
    try {
      await Certificates.generate();
    }
    catch (err) {
      if (!await Certificates.isOpenSslInstalled()) {
        this.#logger.log({ type: 'error', text: en.serverLogs.generateCertificatesErrorOpenssl });
        return;
      }
      this.#logger.log({ type: 'error', text: en.serverLogs.generateCertificatesError, err: err instanceof Error ? { message: err.message } : err });
    }
    const certificates = Certificates.getExistingCertificates<true>();
    try {
      this.#server = tls.createServer({
        key: certificates.serverKey,
        cert: certificates.serverCrt,
        ca: certificates.rootCrt,
        minVersion: 'TLSv1.3',
      }, socket => this.#handleConnection(socket));
      this.#server.listen(1337);
      this.#logger.log({ text: en.serverLogs.serverStarted, type: 'system' });
    }
    catch (err) {
      this.#logger.log({ type: 'error', text: en.serverLogs.serverStartError, err });
    }
  }
  async restart() {
    if (this.#server) {
      this.#server.close();
      this.#server = undefined;
    }
    this.start();
  }
}