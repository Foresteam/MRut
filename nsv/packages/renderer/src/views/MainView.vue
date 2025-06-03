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
import CommandsFromFileDialog from '../components/CommandsFromFileDialog.vue';
import { useConfirm } from 'primevue/useconfirm';

const store = useGeneralStore();
const { cmdLogs } = storeToRefs(store);
const { l } = usePreferencesStore();
const russian = storeToRefs(usePreferencesStore()).languageRussian;

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
const commandsFromFileDialog = ref<ComponentPublicInstance<InstanceType<typeof CommandsFromFileDialog>>>();

const confirm = useConfirm();
const unVerifyUser = (user: IUser) => confirm.require({
	icon: 'pi pi-thumbs-down',
	header: l().mainView.userContext.unVerify.prompt.title(user),
	message: l().mainView.userContext.unVerify.prompt.text,
	acceptLabel: l().ok,
	rejectLabel: l().cancel,
	accept: () => store.updateUser(user.id, { verified: false })
});

const userCtxMenu = ref<ComponentPublicInstance<InstanceType<typeof PContextMenu>>>();
const selectedUser = ref<IUser>();
const onUserRightClick = ($event: MouseEvent, user: IUser) => {
	selectedUser.value = user;
	userCtxMenu.value?.show($event);
};
const userCtx: MenuItem[] = [
	{ label: () => l().mainView.userContext.rename.label, icon: 'pi pi-pencil', command: () => userRenameDialog.value?.show() },
	{ label: () => l().mainView.userContext.unVerify.label, icon: 'pi pi-thumbs-down', command: () => selectedUser.value && unVerifyUser(selectedUser.value) },
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
        <div
          class="flex-row gap-m"
          style="align-items: center;"
        >
          {{ l().users }}
          <i
            v-tooltip.left="l().mainView.noConnectedUsers.tooltip"
            class="pi pi-question-circle"
            style="font-size: 16px;"
          ></i>
        </div>
      </template>
      <div
        v-for="user of store.verifiedUsers"
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
        style="width: 250px"
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
            {{ formatLog(log, Object.values(store.users), russian)[0] }}
            <template v-if="formatLog(log, Object.values(store.users), russian)[1].includes('\\n')">
              <div
                v-for="(line, i) in formatLog(log, Object.values(store.users), russian)[1].split('\\n')"
                :key="`log#${log.uuid}#${i}`"
                class="flex-col cmd-log-line"
              >
                {{ line }}
              </div>
            </template>
            <template v-else>
              {{ formatLog(log, Object.values(store.users), russian)[1] }}
            </template>
            {{ formatLog(log, Object.values(store.users))[2] }}
          </div>
        </div>
      </p-panel>
      <div
        v-show="!store.connectedUsers.length"
        class="flex-row gap-m"
        style="margin-top: 4px; align-items: center;"
      >
        <i
          class="pi pi-exclamation-triangle"
          style="font-size: 24px; color: var(--warning-color)"
        />
        {{ l().mainView.noConnectedUsers.warning }}
      </div>
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
        <p-btn
          icon="pi pi-code"
          :title="l().mainView.runCommandsFromFile.title"
          class="button-bigtext"
          @click="commandsFromFileDialog?.show()"
        />
      </div>
      <InputDialog
        ref="userRenameDialog"
        :query="l().mainView.userContext.rename.prompt.text"
        :title="l().mainView.userContext.rename.prompt.title(selectedUser || {} as IUser)"
        :initial-value="selectedUser?.name"
        @submit="selectedUser && renameUser(selectedUser, $event)"
      />
      <CommandsFromFileDialog ref="commandsFromFileDialog" />
    </div>
  </div>
</template>

<style>
#users-list {
  width: 30%;
  min-width: 250px;
  max-width: 350px;
  flex-shrink: 0;
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
  font-weight: bold;
}

.cmd-log-line {
  padding-left: 8px;
}

.cmd-log-cmd {
  color: var(--primary-color);
}

.cmd-log-system {
  color: var(--text-color-secondary);
  font-weight: normal;
}

.cmd-log-error {
  color: var(--red-600);
  font-weight: normal;
}
</style>