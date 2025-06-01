import { Command, ArgParser } from '@foresteam/cmd-argparse';
import type { Client } from './protocol/Client';
import { readFileSync } from 'fs';
import { basename } from 'path';
import type { Logger } from './Logger';
import { activeLanguage } from '../../../../types/Locales';
import { Config } from './Config';

type CommandFunction = (clients: Client[], netQ: (client: Client) => Client['netQueue'][number]['queue'], logger: Logger) => unknown;
export type Commands = typeof commands;
type QueuedCommand = { clientIds: number[]; action: CommandFunction; id: number; name: keyof Commands | null };
type RunningQueuedCommand = QueuedCommand & { results: Record<string, string[]>; accumulateResults: boolean; resolve?: () => void };

export const luaString = (value: string) => `'${value.replaceAll('\'', '\\\'')}'`;

const russian = new Config().language === 'ru';

const argParser = new ArgParser('');
const commands = {
	download: new Command(
		['download'],
		[{ type: 'string', name: 'src' }, { type: 'string|', name: 'dst' }],
		activeLanguage(russian).commands['download'],
		({ args: { src, dst } }: { args: { src: string, dst: string } }): CommandFunction => (clients, netQ) => clients.forEach(v => {
			netQ(v).push([() => v.expectFile(dst || basename(src.replaceAll('\\', '/'))), `SendFile('${src}'); Print('send')`]);
		})),
	upload: new Command(
		['upload'],
		[{ type: 'string', name: 'src' }, { type: 'string|', name: 'dst' }],
		activeLanguage(russian).commands['upload'],
		({ args: { src, dst } }: { args: { src: string, dst: string } }): CommandFunction => (clients, netQ) => clients.forEach(v => {
			netQ(v).push([
				`ReceiveFile('${dst || basename(src)}')`, // command to receive
				readFileSync(src), // send the file
			]);
		})),
	frun: new Command(
		['frun'],
		[{ type: '...string', name: 'filename' }],
		activeLanguage(russian).commands['frun'],
		({ args: { filename } }: { args: { filename: string[] } }): CommandFunction => (clients, netQ) => clients.forEach(v => netQ(v).push([readFileSync(filename.join(' ')).toString()]))),
	exec: new Command(
		['exec', '>', '!exec', '!>'],
		[{ type: '...string', name: 'cmd' }],
		activeLanguage(russian).commands['exec'],
		({ args: { cmd }, refwith }: { args: { cmd: string[] }, refwith: string }): CommandFunction =>
			(clients, netQ) => clients.forEach(v => netQ(v).push([`${refwith.startsWith('!') ? 'A' : ''}Exec(${luaString(cmd.join(' '))})`]))),
	listdisks: new Command(
		['listdisks', 'ldisks'],
		[],
		activeLanguage(russian).commands['listdisks'],
		(): CommandFunction => (clients, netQ) => clients.forEach(v => netQ(v).push([
			'ListDisks()',
		]))),
	listdir: new Command(
		['listdir', 'ls', 'dir'],
		[{ type: 'string|', name: 'path' }],
		activeLanguage(russian).commands['listdir'],
		({ args: { path } }: { args: { path: string } }): CommandFunction => (clients, netQ) => {
			console.log(`ListDirectory('${path || '.'}')`);
			clients.forEach(c => netQ(c).push([`ListDirectory(${luaString(path || '.')})`]));
		}),
	listplaces: new Command(
		['listplaces', 'lsplaces', 'places'],
		[],
		activeLanguage(russian).commands['listplaces'],
		(): CommandFunction => (clients, netQ) => clients.forEach(c => netQ(c).push(['ListPlaces()']))),
	mkdir: new Command(
		['mkdir', 'md'],
		[{ type: 'string', name: 'path' }],
		activeLanguage(russian).commands['mkdir'],
		({ args: { path } }: { args: { path: string } }): CommandFunction => (clients, netQ) => clients.forEach(c => netQ(c).push([`MkDir(${luaString(path)})`]))),
	touch: new Command(
		['touch'],
		[{ type: 'string', name: 'path' }],
		activeLanguage(russian).commands['touch'],
		({ args: { path } }: { args: { path: string } }): CommandFunction => (clients, netQ) => clients.forEach(c => netQ(c).push([`Touch(${luaString(path)})`]))),
	delete: new Command(
		['delete', 'del', 'rm', 'rmdir', 'rd'],
		[{ type: 'string', name: 'path' }],
		activeLanguage(russian).commands['delete'],
		({ args: { path } }: { args: { path: string } }): CommandFunction => (clients, netQ) => clients.forEach(c => netQ(c).push([`Delete(${luaString(path)})`]))),
	move: new Command(
		['move', 'mv'],
		[{ type: 'string', name: 'source' }, { type: 'string', name: 'destination' }],
		activeLanguage(russian).commands['move'],
		({ args: { source, destination } }: { args: { source: string; destination: string } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push([`Move({${luaString(source)}}, ${luaString(destination)})`])),
	),
	copy: new Command(
		['copy', 'cp'],
		[{ type: 'string', name: 'source' }, { type: 'string', name: 'destination' }],
		activeLanguage(russian).commands['copy'],
		({ args: { source, destination } }: { args: { source: string; destination: string } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push([`Copy({${luaString(source)}}, ${luaString(destination)})`])),
	),
	rename: new Command(
		['rename'],
		[{ type: 'string', name: 'source' }, { type: 'string', name: 'destination' }],
		activeLanguage(russian).commands['rename'],
		({ args: { source, destination } }: { args: { source: string; destination: string } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push([`Rename(${luaString(source)}, ${luaString(destination)})`])),
	),
	logs: new Command(
		['logs'],
		[],
		activeLanguage(russian).commands['logs'],
		(): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push(['Logs()'])),
	),
	mouselock: new Command(
		['mouselock', 'mlock'],
		[{ type: 'bool', name: 'value' }],
		activeLanguage(russian).commands['mouselock'],
		({ args: { value } }: { args: { value: boolean } }): CommandFunction =>
			(clients) => clients.forEach(c => c.inputQueue.push(`input.MouseSetLocked(${value})`)),
	),
	keyboardlock: new Command(
		['keyboardlock', 'kblock'],
		[{ type: 'bool', name: 'value' }],
		activeLanguage(russian).commands['keyboardlock'],
		({ args: { value } }: { args: { value: boolean } }): CommandFunction =>
			(clients) => clients.forEach(c => c.inputQueue.push(`input.KeyboardSetLocked(${value})`)),
	),
	prompt: new Command(
		['prompt', 'inputbox'],
		[],
		activeLanguage(russian).commands['prompt'],
		(): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push('DialogInput()')),
	),
	alertconfirm: new Command(
		['alertconfirm', 'alertyesno', 'alertquestion', 'messageboxconfirm'],
		[{ type: 'string|', name: 'title' }, { type: 'string|', name: 'text' }, { type: 'string|', name: 'type' }],
		activeLanguage(russian).commands['alertconfirm'],
		({ args: { title, text, type } }: { args: { title: string; text: string; type: string; } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push(`DialogConfirm(${luaString(title || '')}, ${luaString(text || '')}, dialog.type.${type || 'BLANK'})`)),
	),
	alertok: new Command(
		['alertok', 'alert', 'message', 'messageboxok'],
		[{ type: 'string|', name: 'title' }, { type: 'string|', name: 'text' }, { type: 'string|', name: 'type' }],
		activeLanguage(russian).commands['alertok'],
		({ args: { title, text, type } }: { args: { title: string; text: string; type: string; } }): CommandFunction =>
			(clients, netQ) => clients.forEach(c => netQ(c).push(`DialogOk(${luaString(title || '')}, ${luaString(text || '')}, dialog.type.${type || 'BLANK'})`)),
	),
	help: new Command(
		['help', '?'],
		[],
		activeLanguage(russian).commands['help'],
		(): CommandFunction => (_, __, logger) => {
			const help: string[] = [];
			for (const [_, command] of Object.entries(commands))
				help.push(command.printHelp());
			logger.log({ type: 'system', text: help.join('\\n') });
		},
	),

	run: new Command(
		['run', ''],
		[{ type: '...string', name: 'cmd' }],
		activeLanguage(russian).commands['run'],
		({ args: { cmd } }: { args: { cmd: string[] } }): CommandFunction => (clients, netQ) => clients.forEach(v => netQ(v).push([cmd.join(' ')]))),
} as const;

export const clients: Client[] = [];
export const runningCommands = new Map<number, RunningQueuedCommand>();
export const lastConnected = -1;
let queueId = 0;

export const getConnectedClients = () => clients.filter(v => v.public.connected);

type RunQueuedParams = { accumulateResults?: boolean; logger: Logger } & ({ resolve?: (data: Record<string, string[]>) => void });
const _RunCommand = ({ accumulateResults = false, resolve, logger }: RunQueuedParams, cmd: QueuedCommand) => {
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
	(cmd as Partial<QueuedCommand>).action?.(clients.filter(c => cmd.clientIds.includes(c.public.id)), client => netQueuesByClientId[client.public.id].queue, logger);
	return running;
};
export const Exec = (line: string, logger: Logger, targets?: number[], params: RunQueuedParams = { logger }) => {
	const parsed = argParser.parse(line, Object.values(commands));
	if (!parsed)
		return null;
	const targetClients = getConnectedClients().filter(client => !targets || targets.includes(client.public.id));
	const clientIds = targetClients.map(client => client.public.id);
	logger.log({ type: 'command', text: line, toSTDIO: false, targets: targetClients });
	const id = queueId++;
	const name = Object.entries(commands).find(([_, command]) => command === parsed.cmd)?.[0] as keyof Commands;
	return _RunCommand(params, { action: parsed.cmd.execute({ args: parsed.args, refwith: parsed.refwith }), clientIds, id, name });
};
export const RunAnonymous = (params: RunQueuedParams, clientIds: number[], action: CommandFunction) => {
	return _RunCommand(params, { action, clientIds, id: queueId++, name: null });
};