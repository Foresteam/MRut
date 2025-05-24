import { Command, ArgParser } from '@foresteam/cmd-argparse';
import type { Client } from './protocol/Client';
import { readFileSync } from 'fs';
import { basename } from 'path';
import type { Logger } from './Logger';

type CommandFunction = (clients: Client[], netQ: (client: Client) => Client['netQueue'][number]['queue']) => unknown;
export type Commands = typeof commands;
type QueuedCommand = { clientIds: number[]; action: CommandFunction; id: number; name: keyof Commands | null };
type RunningQueuedCommand = QueuedCommand & { results: Record<string, string[]>; accumulateResults: boolean; resolve?: () => void };

export const luaString = (value: string) => `'${value.replaceAll('\'', '\\\'')}'`;

const argParser = new ArgParser('');
const commands = {
	download: new Command(
		['download'],
		[{ type: 'string', name: 'src' }, { type: 'string|', name: 'dst' }],
		'Download remote file',
		({ args: { src, dst } }: { args: { src: string, dst: string } }): CommandFunction => (clients, netQ) => clients.forEach(v => {
			netQ(v).push([() => v.expectFile(dst || basename(src.replaceAll('\\', '/'))), `SendFile('${src}'); Print('send')`]);
		})),
	upload: new Command(
		['upload'],
		[{ type: 'string', name: 'src' }, { type: 'string|', name: 'dst' }],
		'Uownload local file',
		({ args: { src, dst } }: { args: { src: string, dst: string } }): CommandFunction => (clients, netQ) => clients.forEach(v => {
			netQ(v).push([
				`ReceiveFile('${dst || basename(src)}')`, // command to receive
				readFileSync(src), // send the file
			]);
		})),
	frun: new Command(
		['frun'],
		[{ type: '...string', name: 'filename' }],
		'Execute Lua code from file on server (your computer)',
		({ args: { filename } }: { args: { filename: string[] } }): CommandFunction => (clients, netQ) => clients.forEach(v => netQ(v).push([readFileSync(filename.join(' ')).toString()]))),
	exec: new Command(
		['exec', '>', '!exec', '!>'],
		[{ type: '...string', name: 'cmd' }],
		'Execute system command, as subprocess',
		({ args: { cmd }, refwith }: { args: { cmd: string[] }, refwith: string }): CommandFunction =>
			(clients, netQ) => clients.forEach(v => netQ(v).push([`${refwith.startsWith('!') ? 'A' : ''}Exec(${luaString(cmd.join(' '))})`]))),
	listdisks: new Command(
		['listdisks', 'ldisks'],
		[],
		'List disks (Windows only)',
		(): CommandFunction => (clients, netQ) => clients.forEach(v => netQ(v).push([
			'ListDisks()',
		]))),
	listdir: new Command(
		['listdir', 'ls', 'dir'],
		[{ type: 'string|', name: 'path' }],
		'List directory',
		({ args: { path } }: { args: { path: string } }): CommandFunction => (clients, netQ) => {
			console.log(`ListDirectory('${path || '.'}')`);
			clients.forEach(c => netQ(c).push([`ListDirectory(${luaString(path || '.')})`]));
		}),
	listplaces: new Command(
		['listplaces', 'lsplaces', 'places'],
		[],
		'List places (home, photos, etc.)',
		(): CommandFunction => (clients, netQ) => clients.forEach(c => netQ(c).push(['ListPlaces()']))),
	mkdir: new Command(
		['mkdir', 'md'],
		[{ type: 'string', name: 'path' }],
		'Create directory',
		({ args: { path } }: { args: { path: string } }): CommandFunction => (clients, netQ) => clients.forEach(c => netQ(c).push([`MkDir(${luaString(path)})`]))),
	touch: new Command(
		['touch'],
		[{ type: 'string', name: 'path' }],
		'Create file',
		({ args: { path } }: { args: { path: string } }): CommandFunction => (clients, netQ) => clients.forEach(c => netQ(c).push([`Touch(${luaString(path)})`]))),
	delete: new Command(
		['delete', 'del', 'rm', 'rmdir', 'rd'],
		[{ type: 'string', name: 'path' }],
		'Delete file/directory, recursively',
		({ args: { path } }: { args: { path: string } }): CommandFunction => (clients, netQ) => clients.forEach(c => netQ(c).push([`Delete(${luaString(path)})`]))),
	move: new Command(
		['move', 'mv'],
		[{ type: 'string', name: 'source' }, { type: 'string', name: 'destination' }],
		'Move file/directory',
		({ args: { source, destination } }: { args: { source: string; destination: string } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push([`Move({${luaString(source)}}, ${luaString(destination)})`])),
	),
	copy: new Command(
		['copy', 'cp'],
		[{ type: 'string', name: 'source' }, { type: 'string', name: 'destination' }],
		'Copy file/directory',
		({ args: { source, destination } }: { args: { source: string; destination: string } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push([`Copy({${luaString(source)}}, ${luaString(destination)})`])),
	),
	rename: new Command(
		['rename'],
		[{ type: 'string', name: 'source' }, { type: 'string', name: 'destination' }],
		'Rename file/directory',
		({ args: { source, destination } }: { args: { source: string; destination: string } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push([`Rename(${luaString(source)}, ${luaString(destination)})`])),
	),
	logs: new Command(
		['logs'],
		[],
		'Print logs',
		(): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push(['Logs()'])),
	),
	mouselock: new Command(
		['mouselock', 'mlock'],
		[{ type: 'bool', name: 'value' }],
		'Set mouse input lock',
		({ args: { value } }: { args: { value: boolean } }): CommandFunction =>
			(clients) => clients.forEach(c => c.inputQueue.push(`input.MouseSetLocked(${value})`)),
	),
	keyboardlock: new Command(
		['keyboardlock', 'kblock'],
		[{ type: 'bool', name: 'value' }],
		'Set keyboard input lock',
		({ args: { value } }: { args: { value: boolean } }): CommandFunction =>
			(clients) => clients.forEach(c => c.inputQueue.push(`input.KeyboardSetLocked(${value})`)),
	),
	prompt: new Command(
		['prompt', 'inputbox'],
		[],
		'Request text input',
		(): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push('DialogInput()')),
	),
	alertconfirm: new Command(
		['alertconfirm', 'alertyesno', 'alertquestion', 'messageboxconfirm'],
		[{ type: 'string|', name: 'title' }, { type: 'string|', name: 'text' }, { type: 'string|', name: 'type' }],
		'Set keyboard input lock',
		({ args: { title, text, type } }: { args: { title: string; text: string; type: string; } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push(`DialogConfirm(${luaString(title || '')}, ${luaString(text || '')}, dialog.type.${type || 'BLANK'})`)),
	),
	alertok: new Command(
		['alertok', 'alert', 'message', 'messageboxok'],
		[{ type: 'string|', name: 'title' }, { type: 'string|', name: 'text' }, { type: 'string|', name: 'type' }],
		'Set keyboard input lock',
		({ args: { title, text, type } }: { args: { title: string; text: string; type: string; } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push(`DialogOk(${luaString(title || '')}, ${luaString(text || '')}, dialog.type.${type || 'BLANK'})`)),
	),

	run: new Command(
		['run', ''],
		[{ type: '...string', name: 'cmd' }],
		'Execute Lua code',
		({ args: { cmd } }: { args: { cmd: string[] } }): CommandFunction => (clients, netQ) => clients.forEach(v => netQ(v).push([cmd.join(' ')]))),
} as const;

export const clients: Client[] = [];
export const runningCommands = new Map<number, RunningQueuedCommand>();
export const lastConnected = -1;
let queueId = 0;

export const getConnectedClients = () => clients.filter(v => v.public.connected);

type RunQueuedParams = { accumulateResults?: boolean } & ({ resolve?: (data: Record<string, string[]>) => void });
const _RunCommand = ({ accumulateResults = false, resolve }: RunQueuedParams, cmd: QueuedCommand) => {
	const running: RunningQueuedCommand = { ...cmd, results: {}, accumulateResults };
	if (accumulateResults && resolve)
		running.resolve = () => resolve(running.results);
	runningCommands.set(cmd.id, running);
	const clients = getConnectedClients();
	const netQueuesByClientId: Record<string, Client['netQueue'][number]> = Object.fromEntries(clients.map(c => {
		const netQ: Client['netQueue'][number] = { command: cmd.name || undefined, queuedCommandId: cmd.id, queue: [] };
		c.netQueue.push(netQ);
		return [c.public.id, netQ];
	}));
	(cmd as Partial<QueuedCommand>).action?.(clients.filter(c => cmd.clientIds.includes(c.public.id)), client => netQueuesByClientId[client.public.id].queue);
	return running;
};
export const Exec = (line: string, logger: Logger, targets?: number[], params: RunQueuedParams = {}) => {
	logger.log(line, { isMe: true, toSTDIO: false });
	const parsed = argParser.parse(line, Object.values(commands));
	if (!parsed)
		return null;
	const clientIds = getConnectedClients().map(client => client.public.id).filter(clientId => !targets || targets.includes(clientId));
	const id = queueId++;
	const name = Object.entries(commands).find(([_, command]) => command === parsed.cmd)?.[0] as keyof Commands;
	return _RunCommand(params, { action: parsed.cmd.execute({ args: parsed.args, refwith: parsed.refwith }), clientIds, id, name });
};
export const RunAnonymous = (params: RunQueuedParams, clientIds: number[], action: CommandFunction) => {
	return _RunCommand(params, { action, clientIds, id: queueId++, name: null });
};