<script lang="ts" setup>
import PBtn from 'primevue/button';
import PDialog from 'primevue/dialog';
import { ref } from 'vue';
import { usePreferencesStore } from '@/store/preferences';

const { l } = usePreferencesStore();

const shown = ref(false);

const onSubmit = async (js: boolean) => {
	const fileName = await window.backend.openFilePicker(false, false, [
		js ? { name: l().mainView.runCommandsFromFile.selectFileJsButtonText, extensions: ['js'] } : { name: l().mainView.runCommandsFromFile.selectFileSimpleButtonText, extensions: ['txt'] }
	]);
	if (!fileName)
		return;
	await window.backend.execFile(fileName);
	hide();
};
const hide = () => shown.value = false;
const show = () => {
	shown.value = true;
};

defineExpose({ show, hide });
</script>

<template>
  <p-dialog
    v-model:visible="shown"
    modal
  >
    <template #header>
      <div class="p-dialog-title">
        {{ l().mainView.runCommandsFromFile.title }}
      </div>
    </template>
    <div class="flex-col">
      <span
        v-for="(line, i) of l().mainView.runCommandsFromFile.help"
        :key="`runCommandsFromFileHelpText#${i}`"
        style="display: block"
      >
        {{ line }}
      </span>
    </div>
    <template #footer>
      <p-btn
        :label="l().mainView.runCommandsFromFile.selectFileSimpleButtonText"
        @click="onSubmit(false)"
      />
      <p-btn
        :label="l().mainView.runCommandsFromFile.selectFileJsButtonText"
        @click="onSubmit(true)"
      />
    </template>
  </p-dialog>
</template>