<script lang="ts" setup>
import PTabMenu from 'primevue/tabmenu';
import PDivider from 'primevue/divider';
import NameCard from '@/components/NameCard.vue';
import AppTab from '@/components/AppTab.vue';
// import Toast from 'primevue/toast';
import PConfirmDialog from 'primevue/confirmdialog';
import PToast from 'primevue/toast';
import { useGeneralStore } from '@/store/general';
import { useRouter } from 'vue-router';
import { computed, onMounted, watch } from 'vue';
import type { MenuItem } from 'primevue/menuitem';
import type { Routes } from './router';
import '$types/IPCTypes';
import { usePreferencesStore } from './store/preferences';
import { storeToRefs } from 'pinia';

const router = useRouter();
const preferences = usePreferencesStore();
const { l } = preferences;
const { themeLight } = storeToRefs(preferences);
const store = useGeneralStore();
const { fetchUsers, fetchLogs } = store;

watch(themeLight, (light) => {
	document.body.classList.toggle('light', light);
}, { immediate: true });

type RouteName = Routes[number]['name'];
const routeLocalizedNames: Record<RouteName, () => string> = {
	'Main': () => l().tabs.main,
	'Files': () => l().tabs.files,
	'Screen view': () => l().tabs.screenView,
	'Settings': () => l().tabs.settings
};
const items = computed(() => router.getRoutes().map(v => ({ label: routeLocalizedNames[v.name as RouteName](), to: v.path } satisfies MenuItem)));
const TITLE = 'MRut';

onMounted(() => {
	window.expose.logCommand(store.logCommand);
	window.expose.modifyUser(store._modifyUser);
	window.expose.setUser(store._modifyUser);
	window.expose.screencast(store.acceptScreenshot);
	fetchUsers();
	fetchLogs();
});
</script>

<template>
  <p-toast></p-toast>
  <p-confirm-dialog></p-confirm-dialog>
  <div id="header">
    <name-card />
    <p-tab-menu
      :model="items"
      style="flex-grow: 1"
    >
      <template #item="{ item }">
        <app-tab :item="item"></app-tab>
      </template>
    </p-tab-menu>
  </div>
  <div id="main">
    <router-view v-slot="{ Component, route }">
      <transition
        name="slide"
        mode="out-in"
      >
        <keep-alive>
          <component
            :is="Component"
            :key="route.path"
          />
        </keep-alive>
      </transition>
    </router-view>
  </div>
  <div id="footer">
    <div
      class="title2-5 shift-em"
      style="line-height: auto"
    >
      {{ TITLE }}
    </div>
    <p-divider layout="vertical" />
    <div
      class="sexy-font title-2"
      style="flex-flow: column; line-height: 27px; text-align: left"
    >
      <div
        class="_title2"
        style="display: flex; align-items: center; gap: 16px"
      >
        <a
          href="https://github.com/Foresteam/MRut"
          style="color: var(--text-primary)"
        ><i
          class="pi pi-github"
          style="font-size: 20pt"
        ></i></a>
        Foresteam, 2025 (AGPL 3.0)
      </div>
    </div>
  </div>
</template>

<style>
@font-face {
	font-family: 'Veles';
	src: url('/assets/fonts/Veles-Regular.0.9.2.otf');
}

@font-face {
	font-family: 'Oxygen';
	src: url('/assets/fonts/Oxygen-Regular.ttf');
}

@font-face {
	font-family: 'Gears of Peace';
	src: url('/assets/fonts/GearsOfPeace.ttf');
}

.sexy-font {
	font-family: 'Veles', 'Liberation mono', sans-serif !important;
}

.shift-em {
	font-family: 'Gears of Peace', 'Liberation mono', sans-serif !important;
}

.title {
	font-size: 40pt;
}

.title2 {
	font-size: 15pt;
}

.title2-5 {
	font-size: 30pt;
}

.slide-enter-active,
.slide-leave-active {
	transition: 0.15s ease-out;
	transform: 0.15s;
}

.slide-enter-from {
	opacity: 0;
	transform: translateY(30%);
}

.slide-leave-to {
	opacity: 0;
	transform: translateY(-30%);
}

#app {
	/* font-family: Avenir, Helvetica, Arial, sans-serif; */
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	background: transparent;
	font-family: 'Liberation mono', sans-serif;
	display: flex;
	flex-flow: column;
	overflow: hidden;
}

body {
	background: var(--surface-b);
	color: var(--text-color);
	margin: 0pt;
}

#app,
body,
html {
	height: 100%
}

#main {
	flex-grow: 1;
	overflow: hidden;
	margin-top: 4pt;
	margin-bottom: 4pt;
	margin-right: 2pt;
	margin-left: 2pt;
}

#header {
	display: flex;
	background: var(--surface-b);
}

#footer {
	display: flex;
	justify-content: center;
	align-items: center;
	background: var(--surface-b);
	border-top: 2px solid var(--surface-d)
}

.ui-block {
	margin-left: 2pt !important;
	margin-right: 2pt !important;
}

.ui-block-b {
	margin-bottom: 2pt !important;
}

.ui-block-t {
	margin-top: 2pt !important;
}

.ui-block-v {
	margin-bottom: 2pt !important;
	margin-top: 2pt !important;
}

.flex-row {
	display: flex;
	flex-flow: row;
}

.flex-col {
	display: flex;
	flex-flow: column;
}

.items-center {
	align-items: center;
}

.justify-center {
	justify-content: center;
}

.h-full {
	height: 100%;
}

.w-full {
	width: 100%;
}

.gap-s {
	gap: 4px;
}

.gap-m {
	gap: 8px;
}

.gap-l {
	gap: 16px;
}

.p-tabmenuitem {
	font-size: 27pt;
}

.p-divider::before {
	border-left: 1px solid var(--surface-d) !important;
}

#footer .p-divider::before {
	border-left: 2px solid var(--surface-d) !important;
}

::-webkit-scrollbar {
	width: 7px;
}

::-webkit-scrollbar-track {
	background-color: var(--surface-c);
}

::-webkit-scrollbar-thumb {
	background: var(--surface-d);
}

::-webkit-scrollbar-thumb:hover {
	background: var(--surface-100);
}

::-webkit-scrollbar-thumb:active {
	background: var(--surface-200);
}
</style>