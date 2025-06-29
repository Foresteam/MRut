import type { IUser, ICmdLog } from './Common';
import type { ConfigData } from '../packages/main/src/backend/Config';

export type MouseButton = 'LEFT' | 'RIGHT' | 'MIDDLE';
export type { SpecialKeys } from '../packages/main/src/backend/common-types';
export type { ConfigData } from '../packages/main/src/backend/Config';

export interface BackendAPI {
	exec: <T extends boolean = false>(line: string, targets?: number[], expectFeedback?: T) => Promise<T extends true ? Record<string, string[]> : void>;
	execFile: (fileName: string) => Promise<void>;
	getUsers: () => Promise<IUser[]>;
	getLogs: () => Promise<ICmdLog[]>;
	updateUser: (id: number, user: Partial<IUser>) => Promise<any>;
	openFilePicker: <T extends boolean = false>(multiple?: T, directory?: boolean, filters?: { extensions: string[]; name: string }[]) => Promise<(T extends true ? string[] : string) | null>;
	openConfigFolder: () => Promise<boolean>;
	clearDb: () => Promise<any>;
	updateCertificates: () => Promise<void>;

	getConfig: () => Promise<ConfigData>;
	updateConfig: (data: Partial<ConfigData>) => Promise<ConfigData>;

	sendMouseButton: (params: { button: MouseButton; state: boolean; applyToAll?: boolean }) => Promise<void>;
	sendMouseScroll: (params: { pixels: number; applyToAll?: boolean }) => Promise<void>;
	sendMousePosition: (params: { xNormalized: number; yNormalized: number; applyToAll?: boolean }) => Promise<void>;
	sendKey: (params: { key: string; state: boolean; applyToAll?: boolean }) => Promise<void>;
	sendDelay: (params: { ms: number; applyToAll?: boolean }) => Promise<void>;
}

export interface ExposedFrontend {
	setUser: (handler: (id: number, data: Partial<IUser>) => void) => any;
	modifyUser: (handler: (id: number, data: Partial<IUser>) => void) => any;
	logCommand: (handler: (log: ICmdLog) => void) => any;
	screencast: (handler: (img: string) => void) => any;
}
declare global {
	interface Window {
		backend: BackendAPI;
		expose: ExposedFrontend;
	}
}