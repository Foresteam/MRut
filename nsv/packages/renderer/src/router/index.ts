import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

const routes = [
	{
		path: '/',
		name: 'Main',
		component: () => import('../views/MainView.vue'),
	},
	{
		path: '/files',
		name: 'Files',
		component: () => import('../views/FilesView.vue'),
	},
	{
		path: '/screenview',
		name: 'Screen view',
		component: () => import('../views/ScreenView.vue'),
	},
	{
		path: '/settings',
		name: 'Settings',
		component: () => import('../views/SettingsView.vue'),
	},
] as const satisfies RouteRecordRaw[];
export type Routes = typeof routes;

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

export default router;