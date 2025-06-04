<script lang="ts" setup>
import '@/assets/common-styles.css';
import PBtnToggle from 'primevue/togglebutton';
import UsersDropdown from '@/components/UsersDropdown.vue';
import MiscButtons, { type IMiscButton } from '@/components/MiscButtons.vue';
import { useGeneralStore } from '@/store/general';
import { ComponentPublicInstance, computed, ref, watch } from 'vue';
import withMouseToServer from '@/composables/withControlsToServer';
import { usePreferencesStore } from '@/store/preferences';
import MessageBoxDialog, { type MessageBoxOpenEvent } from '@/components/MessageBoxDialog.vue';
import { Commands } from '$types/Common';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const store = useGeneralStore();
const { l } = usePreferencesStore();

const sendOpenMessageBoxDialog = ref<ComponentPublicInstance<InstanceType<typeof MessageBoxDialog>> | null>(null);

const captureControls = ref(false);
const takeoverControls = ref(false);
watch(captureControls, v => v && takeoverControls.value && (takeoverControls.value = false));
watch(takeoverControls, v => v && captureControls.value && (captureControls.value = false));
const controls = computed(() => captureControls.value || takeoverControls.value);

const streamOf = computed({
	get: () => store.targetUser,
	set: v => {
		doStream.value = false;
		// if (streamOf.value)
		// 	store.updateUser(streamOf.value.id, { streaming: false });
		if (!v)
			return;
		store.setTarget(v.id);
	},
});
const doStream = computed({
	get: () => streamOf.value?.streaming,
	set: v => streamOf.value && store.updateUser(streamOf.value.id, { streaming: v }),
});

const streamURL = computed(() => store.lastFrame || '/assets/no_stream.webp');

const streamView = ref<HTMLElement | null>(null);
withMouseToServer({ el: streamView, send: controls });

const blockedByMessageBox = ref(false);
const sendOpenMessageBox = async (e: MessageBoxOpenEvent) => {
	const escape = (s: string) => s.replaceAll('"', '\\"');
	if (!streamOf.value)
		return;
	blockedByMessageBox.value = true;
	if (e.type === 'ok')
		return window.backend.exec(`${'alertok' satisfies keyof Commands} "${escape(e.title)}" "${escape(e.text)}" ${e.icon}`, [streamOf.value.id]).finally(() => blockedByMessageBox.value = false);
	const rs = await window.backend.exec(`${'alertconfirm' satisfies keyof Commands} "${escape(e.title)}" "${escape(e.text)}" ${e.icon}`, [streamOf.value.id], true);
	const targetResult = rs[`${streamOf.value.id}`];
	try {
		const userChoice: unknown = JSON.parse(targetResult[0]);
		if (typeof userChoice !== 'boolean')
			throw new TypeError();
		toast.add({
			severity: 'success',
			summary: l().success,
			detail: l().messageBoxDialog.results.success(userChoice),
			life: 3000,
		});
	}
	catch (e) {
		toast.add({
			severity: 'error',
			summary: l().error,
			detail: l().messageBoxDialog.results.error,
			life: 3000,
		});
		throw e;
	}
	finally {
		blockedByMessageBox.value = false;
	}
};
const sendRequestTextInput = async () => {
	if (!streamOf.value)
		return;
	blockedByMessageBox.value = true;
	const rs = await window.backend.exec('prompt' satisfies keyof Commands, [streamOf.value.id], true).catch(() => ({}));
	const targetResult = rs[`${streamOf.value.id}`];
	try {
		const userInput = targetResult.join('\n');
		toast.add({
			severity: 'success',
			summary: l().success,
			detail: l().textInputResults.successFeedback(userInput),
			life: 3000,
		});
	}
	catch (e) {
		toast.add({
			severity: 'error',
			summary: l().error,
			detail: l().messageBoxDialog.results.error,
			life: 3000,
		});
		throw e;
	}
	finally {
		blockedByMessageBox.value = false;
	}
};

const miscButtons: IMiscButton[] = [
	{ label: () => l().screenView.misc.messageBox, icon: 'pi pi-question-circle', callback: () => sendOpenMessageBoxDialog.value?.show() },
	{ label: () => l().screenView.misc.textInput, icon: 'pi pi-ticket', callback: sendRequestTextInput },
	{ label: () => l().screenView.misc.sendTaskMgr, icon: 'pi pi-directions' }
];
</script>

<template>
  <div
    class="flex-row"
    style="height: 100%"
  >
    <div
      id="screenview-panel"
      class="flex-col ui-block"
    >
      <div
        class="set-wrapper ui-block-b"
        style="display: grid; grid-template-columns: 1fr auto; overflow: hidden; width: 100%;"
      >
        <!-- pass the same value to update the target id -->
        <UsersDropdown v-model="streamOf" />
        <p-btn-toggle
          v-model="doStream"
          on-label=""
          off-label=""
          on-icon="pi pi-check"
          off-icon="pi pi-times"
          style="flex-shrink: 0;"
        />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; width: 100%; gap: 4px;">
        <p-btn-toggle
          v-model="captureControls"
          :on-label="l().screenView.captureControls"
          :off-label="l().screenView.captureControls"
          on-icon="pi pi-lock"
          off-icon="pi pi-lock-open"
          class="ui-block-b"
        />
        <p-btn-toggle
          v-model="takeoverControls"
          :on-label="l().screenView.takeoverControls"
          :off-label="l().screenView.takeoverControls"
          on-icon="pi pi-lock"
          off-icon="pi pi-lock-open"
          class="ui-block-b"
        />
      </div>
      <MiscButtons
        class="ui-block-t"
        :buttons="miscButtons"
        :loading="blockedByMessageBox"
      />
    </div>
    <div
      id="stream-view"
      class="ui-block"
    >
      <img
        ref="streamView"
        :src="streamURL"
      >
      <span
        v-if="!store.targetUser?.streaming || !store.lastFrame"
        id="no-stream"
        class="title"
      >The connection is
        <span>dead</span></span>
    </div>
    <MessageBoxDialog
      ref="sendOpenMessageBoxDialog"
      @submit="sendOpenMessageBox"
    />
  </div>
</template>

<style>
.misc-buttons {
  display: flex;
  flex-flow: column;
}

.misc-buttons>.p-button {
  margin: 0;
  margin-top: 2pt;
  margin-bottom: 2pt;
  width: 100%;
}

#no-stream {
  font-weight: bold;
  position: absolute;
  z-index: 100;
  margin-top: -10%;
  text-shadow: 0 0 4px black;
}

#no-stream>span {
  color: black;
  text-shadow: 0 0 4px white;
}

#screenview-panel {
  width: 30%;
  min-width: 320px;
}

#stream-view {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  max-height: 100%;
}

#stream-view>img {
  max-height: 100%;
  max-width: 100%;
  /* z-index: -1; */
}
</style>