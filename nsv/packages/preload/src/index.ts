/**
 * @module preload
 */

import { contextBridge, ipcRenderer, webFrame } from 'electron';
import type { BackendAPI, ExposedFrontend } from '$types/IPCTypes';

webFrame.setVisualZoomLevelLimits(0.5, 4);

window.addEventListener('keydown', (e) => {
	const isCtrl = e.ctrlKey || e.metaKey; // macOS support

	// Zoom in: Ctrl + =
	if (isCtrl && (e.key === '=' || e.key === '+')) {
		e.preventDefault();
		webFrame.setZoomFactor(Math.min(webFrame.getZoomFactor() + 0.1, 4));
	}

	// Zoom out: Ctrl + -
	if (isCtrl && e.key === '-') {
		e.preventDefault();
		webFrame.setZoomFactor(Math.max(webFrame.getZoomFactor() - 0.1, 0.5));
	}

	// Reset zoom: Ctrl + 0
	if (isCtrl && e.key === '0') {
		e.preventDefault();
		webFrame.setZoomFactor(1.0);
	}
});

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
	getLogs: (...args) => ipcRenderer.invoke('getLogs', ...args),
	updateUser: (...args) => ipcRenderer.invoke('updateUser', ...args),
	openFilePicker: (...args) => ipcRenderer.invoke('openFilePicker', ...args),
	openConfigFolder: (...args) => ipcRenderer.invoke('openConfigFolder', ...args),
	clearDb: (...args) => ipcRenderer.invoke('clearDb', ...args),
	updateCertificates: (...args) => ipcRenderer.invoke('updateCertificates', ...args),

	getConfig: (...args) => ipcRenderer.invoke('getConfig', ...args),
	updateConfig: (...args) => ipcRenderer.invoke('updateConfig', ...args),

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