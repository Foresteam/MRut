/**
 * @module preload
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { BackendAPI, ExposedFrontend } from '$types/IPCTypes';

/** Type wrapper */
const exposeTyped = <T>(name: string, backend: T) => contextBridge.exposeInMainWorld(name, backend);

exposeTyped<BackendAPI>('backend', {
	// SelectorDialog: (isDir, mode) => ipcRenderer.invoke('SelectFile', isDir, mode),
	// ExternalURL: url => ipcRenderer.invoke('ExternalURL', url),
	// Configure: (prop, value) => ipcRenderer.invoke('Configure', prop, value),
	// FetchConfig: () => ipcRenderer.invoke('FetchConfig'),
	// Convert: options => ipcRenderer.invoke('Convert', options),
	// EditOpen: options => ipcRenderer.invoke('EditOpen', options),
	// EditClose: () => ipcRenderer.send('EditClose')
	exec: (...args) => ipcRenderer.invoke('exec', ...args),
	getUsers: (...args) => ipcRenderer.invoke('getUsers', ...args),
	updateUser: (...args) => ipcRenderer.invoke('updateUser', ...args),
	onLoad: (...args) => ipcRenderer.invoke('onLoad', ...args),
	openFilePicker: (...args) => ipcRenderer.invoke('openFilePicker', ...args),
	clearDb: (...args) => ipcRenderer.invoke('clearDb', ...args),
	sendMouseButton: (...args) => ipcRenderer.invoke('sendMouseButton', ...args),
	sendMouseScroll: (...args) => ipcRenderer.invoke('sendMouseScroll', ...args),
	sendKey: (...args) => ipcRenderer.invoke('sendKey', ...args),
	sendMousePosition: (...args) => ipcRenderer.invoke('sendMousePosition', ...args),
	sendDelay: (...args) => ipcRenderer.invoke('sendDelay', ...args),
});

exposeTyped<ExposedFrontend>('expose', {
	setUser: handler => ipcRenderer.on('setUser', (_, ...args) => (handler as any)(...args)),
	modifyUser: handler => ipcRenderer.on('modifyUser', (_, ...args) => (handler as any)(...args)),
	logCommand: handler => ipcRenderer.on('logCommand', (_, ...args) => (handler as any)(...args)),
	screencast: handler => ipcRenderer.on('screencast', (_, ...args) => (handler as any)(...args)),
});