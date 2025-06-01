import { defineStore } from 'pinia';
import type { IUser, ICmdLog } from '$types/Common';

export const useGeneralStore = defineStore('general', {
	state: () => ({
		users: {} as { [key: number]: IUser },
		cmdLogs: [] as ICmdLog[],
		_targetUser: null as null | IUser,
		lastFrame: null as string | null,
	}),
	getters: {
		connectedUsers(state) {
			return Object.values(state.users).filter(v => v.connected);
		},
		onlineUsers(state) {
			return Object.values(state.users).filter(v => v.online);
		},
		targetUser(state) {
			return state._targetUser?.connected ? state._targetUser : null;
		},
	},
	actions: {
		setTarget(id: number | null) {
			this._targetUser = id != null ? this.users[id] : null;
		},
		_modifyUser(id: number, data: Partial<IUser>) {
			const user = this.users[id];
			if (!user)
				return this.users[id] = data as any;
			for (const [k, v] of Object.entries(data)) {
				if (k == 'connected' && this.targetUser?.id == id)
					this.setTarget(null);
				user[k] = v;
			}
		},
		async fetchUsers() {
			for (const v of await window.backend.getUsers())
				this.updateUser(v.id, v);
		},
		async fetchLogs() {
			const logs = await window.backend.getLogs();
			this.cmdLogs = logs;
		},
		async updateUser(id: number, data: Partial<IUser>) {
			this._modifyUser(id, data);
			window.backend.updateUser(id, data);
		},
		logCommand(log: ICmdLog) {
			this.cmdLogs.push(log);
		},
		acceptScreenshot(img: string) {
			this.lastFrame = img;
		},
	},
});