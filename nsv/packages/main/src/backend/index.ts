import { dialog, ipcMain, shell } from 'electron';
import * as commands from './commands';
import { Client } from './protocol/Client';
import { ActionMessage } from './protocol/Message';
import { type BackendAPI, type ExposedFrontend } from '$types/IPCTypes';
import { SpecialKeys, Action } from './common-types';
import * as _ from 'lodash';
import type { IUser, IUserHandshake } from '$types/Common';
import * as db from './Db';
import type { Log } from './Logger';
import { Logger } from './Logger';
import { SecureServer } from './protocol/SecureServer';
import path from 'node:path';
import { Certificates } from './Certififaces';

let window = undefined as undefined | Electron.BrowserWindow;
export const setWindow = (w: Electron.BrowserWindow) => window = w;

const ipcHandle = <T extends keyof BackendAPI>(name: T, f: (e: Electron.IpcMainInvokeEvent, ...args: Parameters<BackendAPI[T]>) => ReturnType<BackendAPI[T]>) =>
	ipcMain.handle(name, f as any);
const ipcEmit = <T extends keyof ExposedFrontend>(name: T, ...args: Parameters<Parameters<ExposedFrontend[T]>[0]>) =>
	window?.webContents.send(name, ...args);

/** @brief Load from DB */
commands.clients.splice(0, commands.clients.length, ...Client.loadAll());

const onModifyUser = (client: Client, update: Partial<IUser>) => {
	client.save();
	return ipcEmit('modifyUser', client.public.id, update);
};

const logger = new Logger((params: Log) => ipcEmit('logCommand', params), () => commands.clients);

const server = new SecureServer(logger, onModifyUser, client => {
	ipcEmit('setUser', client.public.id, client.public);

	client.on('message', ActionMessage, async (message: ActionMessage) => {
		const [code, data] = [message.action, message.data];
		let netQ: Client['netQueue'][number] | undefined;
		let commandInQ: ReturnType<typeof commands.runningCommands.get>;
		const updateNetQ = () => {
			netQ = client.netQueue.at(0);
			commandInQ = netQ && commands.runningCommands.get(netQ.queuedCommandId);
		};
		updateNetQ();
		switch (code) {
			case Action.HANDSHAKE: {
				const handshake: IUserHandshake = JSON.parse(data.toString('utf-8'));
				return await server.performHandshake(client, handshake);
			}
			case Action.IDLE: {
				if (!netQ) {
					return client.sendMessage(client.inputQueue.flush());
				}
				let todo = netQ.queue?.splice(0, 1)[0];
				if (!todo) {
					client.netQueue.splice(0, 1);
					updateNetQ();
					if (!netQ)
						return client.sendMessage(client.inputQueue.flush());
					todo = netQ.queue?.splice(0, 1)[0];
				}
				// console.log('q', netQ, netQ.queue.length, commandInQ && commandInQ.accumulateResults);
				if (!netQ.queue.length) {
					if (commandInQ && commandInQ.accumulateResults) {
						commandInQ.clientIds = commandInQ.clientIds.filter(id => id !== client.public.id);
						// if (!commandInQ.clientIds.length)
						// 	commands.runningCommands.delete(commandInQ.id);
					}
				}
				if (!todo)
					return client.sendMessage(client.inputQueue.flush());
				if (typeof (todo) == 'string' || todo instanceof Buffer || typeof todo === 'function')
					todo = [todo];
				for (const task of todo) {
					if (typeof task === 'function') {
						task();
						continue;
					}
					if (task && task.length > 0) {
						if (task instanceof Buffer)
							client.sendMessage(task);
						else
							client.sendMessage([client.inputQueue.flush(), task].join(';'));
					}
					else
						client.sendMessage(client.inputQueue.flush());
				}
				client.public.processing = true;
				onModifyUser(client, { processing: client.public.processing });
				return;
			}
			case Action.FEEDBACK:
				// console.log('wt?', netQ, commandInQ?.accumulateResults, commandInQ?.clientIds);
				if (commandInQ?.accumulateResults) {
					commandInQ.results[client.public.id.toString()] ||= [];
					for (const line of data.toString('utf-8').split('\\n'))
						commandInQ.results[client.public.id.toString()].push(line);
					if (!commandInQ.clientIds.length) {
						// console.log('RESOLVE!', commandInQ.results);
						commandInQ.resolve?.();
						netQ && commands.runningCommands.delete(netQ.queuedCommandId);
					}
				}
				else
					logger.log({ type: 'feedback', text: data.toString('utf-8'), sender: client });
				client.public.processing = false;
				onModifyUser(client, { processing: client.public.processing });
				return;
			case Action.SCREENCAST: {
				if (!client.public.streaming) {
					client.inputQueue.push('SetIsStreaming(false)');
					return;// client.sendMessage('');
				}
				ipcEmit('screencast', 'data:image/png;base64,' + data.toString('base64'));
				return;// client.sendMessage('');
			}
		}
	});
});

const closeAll = () => {
	commands.clients.forEach(v => v.close());
	commands.clients.splice(0, commands.clients.length);
	console.log('closed');
};

process.on('SIGINT', closeAll);
process.on('exit', closeAll);
process.on('SIGUSR2', closeAll);

export function setupIPC() {
	ipcHandle('exec', async (_, line, targets, expectFeedback = false) => {
		console.log('call', line, targets, expectFeedback);
		if (expectFeedback) {
			console.log('expect!', targets, line);
			return await new Promise(resolve => commands.Exec(line, logger, targets, { accumulateResults: true, resolve }));
		}
		commands.Exec(line, logger);
	});
	ipcHandle('getUsers', async () => commands.clients.map(v => v.public));
	ipcHandle('getLogs', async () => logger.logs);
	ipcHandle('updateUser', async (__, id, user) => {
		const client = commands.clients[id];
		if (!client)
			return;
		const netQ: string[] = [];
		const clientPublic = client.public;
		const oldPublic = _.cloneDeep(clientPublic);
		for (const [k, v] of Object.entries(user)) {
			const _v = clientPublic[k];
			// console.log('update!', id, k, v, _v);
			if (k === 'streaming' && _v != v)
				netQ.push(`SetIsStreaming(${v})`);
			clientPublic[k] = v;
		}
		if (!_.isEqual(oldPublic, clientPublic))
			client.save();
		if (netQ.length)
			commands.RunAnonymous({}, [id], (clients, _netQ) => clients.forEach(c => _netQ(c).splice(_netQ(c).length, 0, ...netQ)));
	});
	ipcHandle('openFilePicker', async (_, multiple = false, directory = false) => {
		const properties: Parameters<typeof dialog.showOpenDialog>[0]['properties'] = [directory ? 'openDirectory' : 'openFile'];
		if (multiple) {
			properties.push('multiSelections');
		}

		const result = await dialog.showOpenDialog({
			properties,
			title: 'Select file(s)',
			buttonLabel: 'Select',
		});

		if (result.canceled || !result.filePaths.length)
			return null;
		return multiple ? result.filePaths : result.filePaths[0];
	});
	ipcHandle('openConfigFolder', async (_) => {
		const folderPath = db.configFolder;
		if (!folderPath)
			return false;

		try {
			await shell.openPath(path.resolve(folderPath));
			return true;
		} catch (err) {
			logger.log({ type: 'error', text: 'Failed to open folder', err });
			return false;
		}
	});
	ipcHandle('clearDb', async () => {
		db.clear();
		logger.log({ type: 'system', text: 'DB cleared' });
	});
	ipcHandle('updateCertificates', async () => {
		Certificates.deleteServer();
		await Certificates.generate();
		logger.log({ type: 'system', text: 'Certificates regenerated' });
		await server.restart();
	});

	ipcHandle('sendMouseButton', async (_, { button, state, applyToAll }) => {
		const targets = applyToAll ? commands.getConnectedClients() : [commands.getConnectedClients().find(v => v.public.streaming)];
		if (!targets.every(target => !!target) || !targets.length)
			return;
		targets.forEach(target => target.inputQueue.push(`input.MouseSetPressed(MOUSE_BUTTONS.${button}, ${state})`));
	});
	ipcHandle('sendMousePosition', async (_, { xNormalized, yNormalized, applyToAll }) => {
		const targets = applyToAll ? commands.getConnectedClients() : [commands.getConnectedClients().find(v => v.public.streaming)];
		if (!targets.every(target => !!target) || !targets.length)
			return;
		targets.forEach(target => target.inputQueue.push(`input.MouseMove(${xNormalized}, ${yNormalized})`));
	});
	ipcHandle('sendMouseScroll', async (_, { pixels, applyToAll }) => {
		const targets = applyToAll ? commands.getConnectedClients() : [commands.getConnectedClients().find(v => v.public.streaming)];
		if (!targets.every(target => !!target) || !targets.length)
			return;
		targets.forEach(target => target.inputQueue.push(`input.MouseScroll(${pixels})`));
	});
	ipcHandle('sendKey', async (_, { key, state, applyToAll }) => {
		const targets = applyToAll ? commands.getConnectedClients() : [commands.getConnectedClients().find(v => v.public.streaming)];
		if (!targets.every(target => !!target) || !targets.length)
			return;
		targets.forEach(target => target.inputQueue.push(`input.KeySetPressed(${key in SpecialKeys ? `SPECIAL_KEYS.${key}` : commands.luaString(key.toLowerCase())}, ${state})`));
	});
	ipcHandle('sendDelay', async (_, { ms, applyToAll }) => {
		const targets = applyToAll ? commands.getConnectedClients() : [commands.getConnectedClients().find(v => v.public.streaming)];
		if (!targets.every(target => !!target) || !targets.length)
			return;
		targets.forEach(target => target.inputQueue.push(`input.Delay(${ms})`));
	});

	server.start();
}