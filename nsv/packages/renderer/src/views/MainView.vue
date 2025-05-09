<script lang="ts" setup>
import '@/assets/common-styles.css';
import PBtn from 'primevue/button';
import PInputText from 'primevue/inputtext';
import PPanel from 'primevue/panel';
import User from '@/components/UserCard.vue';
import { nextTick, onActivated, onMounted, ref, watch } from 'vue';
import { useGeneralStore } from '@/store/general';
import { storeToRefs } from 'pinia';
import { usePreferencesStore } from '@/store/preferences';

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
        v-for="v of store.users"
        :key="v.id"
        :class="{
          'flex-col': true,
          'user-button': true,
          'user-button-selected': v.connected
        }"
        @click="updateUser(v.id, { connected: !v.connected, streaming: false })"
      >
        <User :user="v" />
      </div>
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
            :key="`log#${log.id}`"
            :class="{
              'flex-col': true,
              'cmd-log': true,
              'cmd-log-me': log.isMe
            }"
          >
            [{{ log.time }}{{ log.isMe ? '' : ' ' + log.sender }}]
            <template v-if="log.text.includes('\\n')">
              <div
                v-for="(line, i) in log.text.split('\\n')"
                :key="`log#${log.id}#${i}`"
                class="flex-col cmd-log-line"
              >
                {{ line }}
              </div>
            </template>
            <template v-else>
              {{ log.text }}
            </template>
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
      <!-- <div class="flex-row misc-buttons">
				<MiscButtons />
			</div> -->
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

.cmd-log-me {
  color: var(--primary-color);
}
</style>