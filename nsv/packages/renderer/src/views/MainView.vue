<script lang="ts" setup>
import '@/assets/common-styles.css';
import PBtn from 'primevue/button';
import PInputText from 'primevue/inputtext';
import PPanel from 'primevue/panel';
import User from '@/components/UserCard.vue';
import { ComponentPublicInstance, onActivated, ref, watch } from 'vue';
import { useGeneralStore } from '@/store/general';
import { storeToRefs } from 'pinia';
import { usePreferencesStore } from '@/store/preferences';
import PContextMenu from 'primevue/contextmenu';
import type { MenuItem } from 'primevue/menuitem';
import { IUser } from '$types/Common';
import InputDialog from '@/components/InputDialog.vue';
import { formatLog } from '../../../../shared/formatLogs';

const store = useGeneralStore();
const { cmdLogs } = storeToRefs(store);
const { l } = usePreferencesStore();

const { updateUser } = store;

const command = ref('');

const sendCommand = async (cmd: string) => {
	command.value = '';
	await window.backend.exec(cmd.trim());
};

const cmdLogsPanel = ref<HTMLElement | null>(null);
watch(cmdLogs.value, () => setTimeout(() => {
	if (!cmdLogsPanel.value)
		return;
	const panel = cmdLogsPanel.value.parentNode as HTMLElement;
	panel.scroll({ top: panel.scrollHeight });
}, 100));
onActivated(() => {
	if (!cmdLogsPanel.value)
		return;
	const panel = cmdLogsPanel.value.parentNode as HTMLElement;
	panel.scroll({ top: panel.scrollHeight });
});

const renameUser = async (user: IUser, name: string) => store.updateUser(user.id, { name: name || undefined });
const userRenameDialog = ref<ComponentPublicInstance<InstanceType<typeof InputDialog>>>();

const userCtxMenu = ref<ComponentPublicInstance<InstanceType<typeof PContextMenu>>>();
const selectedUser = ref<IUser>();
const onUserRightClick = ($event: MouseEvent, user: IUser) => {
	selectedUser.value = user;
	userCtxMenu.value?.show($event);
};
const userCtx: MenuItem[] = [
	{ label: () => l().mainView.userContext.rename.label, icon: 'pi pi-pencil', command: () => userRenameDialog.value?.show() },
];

defineExpose({ cmdLogsPanel });
</script>

<template>
  <div
    style="height: 100%"
    class="flex-row"
  >
    <p-panel
      id="users-list"
      class="ui-block list-panel"
    >
      <template #header>
        {{ l().users }}
      </template>
      <div
        v-for="user of store.users"
        :key="user.id"
        :class="{
          'flex-col': true,
          'user-button': true,
          'user-button-selected': user.connected
        }"
        @click="updateUser(user.id, { connected: !user.connected, streaming: false })"
        @contextmenu="onUserRightClick($event, user)"
      >
        <User :user="user" />
      </div>
      <p-context-menu
        ref="userCtxMenu"
        :model="userCtx"
      />
    </p-panel>
    <div
      class="ui-block flex-col"
      style="flex-grow: 1"
    >
      <p-panel
        id="cmd-logs"
        class="list-panel"
      >
        <template #header>
          {{ l().logs }}
        </template>
        <div ref="cmdLogsPanel">
          <div
            v-for="log in cmdLogs"
            :key="`log#${log.uuid}`"
            :class="{
              'flex-col': true,
              'cmd-log': true,
              'cmd-log-cmd': log.type === 'command',
              'cmd-log-system': log.type === 'system',
              'cmd-log-error': log.type === 'error',
            }"
          >
            {{ formatLog(log, Object.values(store.users))[0] }}
            <template v-if="log.text.includes('\\n')">
              <div
                v-for="(line, i) in log.text.split('\\n')"
                :key="`log#${log.uuid}#${i}`"
                class="flex-col cmd-log-line"
              >
                {{ line }}
              </div>
            </template>
            <template v-else>
              {{ log.text }}
            </template>
            {{ formatLog(log, Object.values(store.users))[2] }}
          </div>
        </div>
      </p-panel>
      <div class="ui-block-t flex-row set-wrapper">
        <p-input-text
          v-model="command"
          style="flex-grow: 1;"
          name="command"
          :placeholder="l().enterACommand"
          @keyup.enter="sendCommand(command)"
        />
        <p-btn
          icon="pi fi fi-flutter-right"
          class="button-bigtext"
          @click="sendCommand(command)"
        />
      </div>
      <InputDialog
        ref="userRenameDialog"
        :query="l().mainView.userContext.rename.prompt.text"
        :title="l().mainView.userContext.rename.prompt.title(selectedUser || {} as IUser)"
        :initial-value="selectedUser?.name"
        @submit="selectedUser && renameUser(selectedUser, $event)"
      />
    </div>
  </div>
</template>

<style>
#users-list {
  width: 30%;
  min-width: 200px;
  max-width: 350px;
}

.list-panel {
  height: 100%;
  display: flex;
  flex-flow: column;
  overflow: hidden;
}

.list-panel>.p-toggleable-content {
  overflow-y: hidden;
  flex-grow: 1;
}

.list-panel .p-panel-content {
  overflow-y: scroll;
  padding: 0;
  height: 100%;
}

.user-button {
  cursor: pointer;
  width: 100%;
  padding: 2pt 10px 2pt 10px;
}

.user-button> {
  width: 100%;
}

.user-button:hover {
  background-color: var(--surface-c);
}

.user-button-selected {
  background-color: var(--selected-pale);
}

.user-button-selected:hover {
  background-color: var(--selected-pale);
}

.cmd-log {
  text-align: left;
  white-space: normal;
  word-wrap: break-word;
  word-break: break-word;
}

.cmd-log-line {
  padding-left: 8px;
}

.cmd-log-cmd {
  color: var(--primary-color);
}

.cmd-log-system {
  color: var(--text-color-secondary);
}

.cmd-log-error {
  color: var(--red-600);
}
</style>