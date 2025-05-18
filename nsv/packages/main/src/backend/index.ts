import * as net from 'net';
import { dialog, ipcMain } from 'electron';
import * as commands from './commands';
import { Client } from './protocol/Client';
import { ActionMessage } from './protocol/Message';
import { type BackendAPI, type ExposedFrontend } from '$types/IPCTypes';
import { SpecialKeys, Action } from './common-types';
import * as _ from 'lodash';

let window = undefined as undefined | Electron.BrowserWindow;
export const setWindow = (w: Electron.BrowserWindow) => window = w;

const ipcHandle = <T extends keyof BackendAPI>(name: T, f: (e: Electron.IpcMainInvokeEvent, ...args: Parameters<BackendAPI[T]>) => ReturnType<BackendAPI[T]>) =>
	ipcMain.handle(name, f as any);
const ipcEmit = <T extends keyof ExposedFrontend>(name: T, ...args: Parameters<Parameters<ExposedFrontend[T]>[0]>) =>
	window?.webContents.send(name, ...args);

const Log = (text: string, { sender = '', isMe = false, toSTDIO = true } = {}): void => {
	let time = new Date().toTimeString();
	time = time.substring(0, time.indexOf(' GMT'));
	if (toSTDIO)
		console.log(`[${time}${isMe ? '' : ' ' + sender}] ${text.split('\n').join('\n\t')}`);
	ipcEmit('logCommand', { time, text, isMe, sender });
};

const server = net.createServer(socket => {
	socket.setNoDelay(true);
	const foundClient = commands.clients.findIndex(v => v.public.address == socket.remoteAddress?.replaceAll('::ffff:', ''));
	let client: Client;
	if (foundClient >= 0) {
		client = commands.clients[foundClient];
		client.onReconnect(socket);
	}
	else {
		client = new Client(socket);
		commands.clients.push(client);
	}
	ipcEmit('setUser', client.public.id, client.public);
	// socket.setEncoding('utf-8');
	// client.on('message', FileMessage, () => client.sendMessage(''));
	client.on('message', ActionMessage, (message: ActionMessage) => {
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
				try {
					const handshake: { hostname: string; timestampMs: number; username: string } = JSON.parse(data.toString('utf-8'));
					client.public.hostname = handshake.hostname;
					client.public.startTimeMs = handshake.timestampMs;
					client.public.diffTimeMs = Date.now() - handshake.timestampMs;
					client.public.username = handshake.username;

					ipcEmit('modifyUser', client.public.id, _.pick(client.public, ['hostname', 'startTimeMs', 'diffTimeMs', 'username']));
					client.sendMessage(JSON.stringify({}));
				}
				catch (e) {
					console.error('Handshake failed');
					throw e;
				}
				return;
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
				ipcEmit('modifyUser', client.public.id, { processing: client.public.processing });
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
					Log(data.toString('utf-8'), { sender: `${client.public.name || client.public.hostname}#${client.public.id}` });
				client.public.processing = false;
				ipcEmit('modifyUser', client.public.id, { processing: client.public.processing });
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
	// socket.Send('print(\'Blambda\')');

	const setClientOffline = (e: Error | null) => {
		Log(String(e?.stack));
		client.public.online = false;
		ipcEmit('modifyUser', client.public.id, { online: client.public.online });
	};
	socket.on('error', setClientOffline);
	socket.on('close', setClientOffline);
});

const closeAll = () => {
	commands.clients.forEach(v => v.close());
	commands.clients.splice(0, commands.clients.length);
	console.log('closed');
};

process.on('SIGINT', closeAll);
process.on('exit', closeAll);
process.on('SIGUSR2', closeAll);

function setupServer() {
	server.listen(1337);
}

export function setupIPC() {
	ipcHandle('exec', async (_, line, targets, expectFeedback = false) => {
		console.log('call', line, targets, expectFeedback);
		if (expectFeedback) {
			console.log('expect!', targets, line);
			return await new Promise(resolve => commands.Exec(line, Log, targets, { accumulateResults: true, resolve }));
		}
		commands.Exec(line, Log);
	});
	ipcHandle('getUsers', async () => commands.clients.map(v => v.public));
	ipcHandle('updateUser', async (_, id, user) => {
		if (!commands.clients[id])
			return;
		const netQ: string[] = [];
		for (const [k, v] of Object.entries(user)) {
			const _v = commands.clients[id].public[k];
			// console.log('update!', id, k, v, _v);
			if (k === 'streaming' && _v != v)
				netQ.push(`SetIsStreaming(${v})`);
			commands.clients[id].public[k] = v;
		}
		if (netQ.length)
			commands.RunAnonymous({}, [id], (clients, _netQ) => clients.forEach(c => _netQ(c).splice(_netQ(c).length, 0, ...netQ)));
	});
	ipcHandle('onLoad', async () => {
		for (const u of commands.clients)
			ipcEmit('setUser', u.public.id, u.public);
		console.log('Users synced');
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

	setupServer();
}