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
import type { ConfigData } from './Config';
import { Config } from './Config';
import { en } from '../../../../types/Locales';
import fs from 'node:fs';
import vm from 'node:vm';

let window = undefined as undefined | Electron.BrowserWindow;
export const setWindow = (w: Electron.BrowserWindow) => window = w;

const ipcHandle = <T extends keyof BackendAPI>(name: T, f: (e: Electron.IpcMainInvokeEvent, ...args: Parameters<BackendAPI[T]>) => ReturnType<BackendAPI[T]>) =>
	ipcMain.handle(name, f as any);
const ipcEmit = <T extends keyof ExposedFrontend>(name: T, ...args: Parameters<Parameters<ExposedFrontend[T]>[0]>) => {
	if (!window || window.isDestroyed() || !window.webContents || window.webContents.isDestroyed())
		return;
	return window.webContents.send(name, ...args);
};

/** @brief Load from DB */
commands.clients.splice(0, commands.clients.length, ...Client.loadAll());

const onModifyUser = (client: Client, update: Partial<IUser>) => {
	client.save();
	return ipcEmit('modifyUser', client.public.id, update);
};

const logger = new Logger((params: Log) => ipcEmit('logCommand', params), () => commands.clients);
const config = new Config();

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
				client.public.processing = false;
				onModifyUser(client, { processing: client.public.processing });

				if (!netQ) {
					return await client.sendMessage(client.inputQueue.flush());
				}
				let todo = netQ.queue?.splice(0, 1)[0];
				if (!todo) {
					client.netQueue.splice(0, 1);
					updateNetQ();
					if (!netQ)
						return await client.sendMessage(client.inputQueue.flush());
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
					return await client.sendMessage(client.inputQueue.flush());
				if (typeof (todo) == 'string' || todo instanceof Buffer || typeof todo === 'function')
					todo = [todo];
				for (const task of todo) {
					if (typeof task === 'function') {
						task();
						continue;
					}
					if (task && task.length > 0) {
						if (task instanceof Buffer)
							await client.sendMessage(task);
						else
							await client.sendMessage([client.inputQueue.flush(), task].join(';'));
					}
					else
						await client.sendMessage(client.inputQueue.flush());
				}
				client.public.processing = true;
				onModifyUser(client, { processing: client.public.processing });
				return;
			}
			case Action.FEEDBACK:
				// console.log('wt?', netQ, commandInQ?.accumulateResults, commandInQ?.clientIds);
				if (commandInQ?.accumulateResults) {
					commandInQ.results[client.public.id.toString()] ||= [];
					for (const line of data.toString('utf-8').split('\n').flatMap(ss => ss.split('\\n')))
						commandInQ.results[client.public.id.toString()].push(line);
					if (!commandInQ.clientIds.length) {
						// console.log('RESOLVE!', commandInQ.results);
						commandInQ.resolve?.();
						netQ && commands.runningCommands.delete(netQ.queuedCommandId);
					}
				}
				else
					logger.log({ type: 'feedback', text: data.toString('utf-8'), sender: client });
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
			return await new Promise(resolve => commands.Exec(line, logger, targets, { accumulateResults: true, resolve, logger }));
		}
		commands.Exec(line, logger);
	});
	ipcHandle('execFile', async (_, fileName) => {
		const code = fs.readFileSync(fileName, 'utf-8');
		let lines: string[];
		console.info(fileName, path.extname(fileName));
		if (path.extname(fileName) === '.js') {
			const context = {
				path,
				Log: (...args: unknown[]) => logger.log({ type: 'system', text: args.map(arg => `${arg}`).join('\\n') }),
				LogError: (...args: unknown[]) => logger.log({ type: 'error', text: args.map(arg => `${arg}`).join('\\n') }),
			};
			try {
				const rs: unknown = await vm.runInNewContext(code, context);
				if (typeof rs !== 'object' || !Array.isArray(rs)) {
					logger.log({ type: 'error', text: en.serverLogs.runFileInvalidResult });
					return;
				}
				lines = rs.map(v => `${v}`);
			}
			catch (err) {
				logger.log({ type: 'error', text: en.serverLogs.runFileError, err: (err as Error).message });
				return;
			}
		}
		else
			lines = code.split('\n');

		for (const line of lines)
			commands.Exec(line.trim(), logger);
	});
	ipcHandle('getUsers', async () => commands.clients.map(v => v.public));
	ipcHandle('getLogs', async () => logger.logs);
	ipcHandle('updateUser', async (__, id, user) => {
		const client = commands.clients.find(client => client.public.id === id);
		if (!client)
			return;
		const netQ: string[] = [];
		const clientPublic = client.public;
		const oldPublic = _.cloneDeep(clientPublic);
		let closeClient = false;
		for (const [k, v] of Object.entries(user)) {
			const _v = clientPublic[k];
			// console.log('update!', id, k, v, _v);
			if (k === 'streaming' && _v !== v)
				netQ.push(`SetIsStreaming(${v})`);
			if (k === 'verified' && _v !== v)
				closeClient = true;
			clientPublic[k] = v;
		}
		if (!_.isEqual(oldPublic, clientPublic))
			client.save();
		if (closeClient)
			client.close();
		if (netQ.length)
			commands.RunAnonymous({ logger }, [id], (clients, _netQ) => clients.forEach(c => _netQ(c).splice(_netQ(c).length, 0, ...netQ)));
	});
	ipcHandle('openFilePicker', async (_, multiple = false, directory = false, filters) => {
		const properties: Parameters<typeof dialog.showOpenDialog>[0]['properties'] = [directory ? 'openDirectory' : 'openFile'];
		if (multiple) {
			properties.push('multiSelections');
		}

		const result = await dialog.showOpenDialog({
			properties,
			title: 'Select file(s)',
			buttonLabel: 'Select',
			filters: !directory && filters || undefined,
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
			logger.log({ type: 'error', text: en.serverLogs.failedToOpenFolder, err });
			return false;
		}
	});
	ipcHandle('clearDb', async () => {
		db.clear();
		commands.clients.forEach(c => c.close());
		commands.clients.splice(0, commands.clients.length, ...Client.loadAll());
		logger.log({ type: 'system', text: en.serverLogs.dbCleared });
	});
	ipcHandle('updateCertificates', async () => {
		Certificates.deleteServer();
		await Certificates.generate();
		logger.log({ type: 'system', text: en.serverLogs.certificatesRegenerated });
		await server.restart();
	});

	ipcHandle('getConfig', async () => config.getData());
	ipcHandle('updateConfig', async (_, data) => {
		for (const [k, v] of Object.entries(data))
			config[k as keyof ConfigData] = v as ConfigData[keyof ConfigData];
		return config.getData();
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