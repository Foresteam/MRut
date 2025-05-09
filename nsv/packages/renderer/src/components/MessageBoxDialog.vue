<script lang="ts" setup>
import PInputText from 'primevue/inputtext';
import PSelectButton from 'primevue/selectbutton';
import PBtn from 'primevue/button';
import PDialog from 'primevue/dialog';
import { computed, ref, watch } from 'vue';
import { usePreferencesStore } from '@/store/preferences';

export type MessageBoxOpenEvent = { title: string; text: string; type: 'ok' | 'confirm'; icon: 'BLANK' | 'INFO' | 'QUESTION' | 'WARNING' | 'ERROR' };

const emit = defineEmits<{ (e: 'submit', data: MessageBoxOpenEvent): any }>();

const { l } = usePreferencesStore();

const typeOptionsMap = computed(() => ({
	[l().messageBoxDialog.types[0]]: 'ok',
	[l().messageBoxDialog.types[1]]: 'confirm'
} as const));
const iconOptionsMap = computed(() => ({
	[l().messageBoxDialog.icons[0]]: 'BLANK',
	[l().messageBoxDialog.icons[1]]: 'INFO',
	[l().messageBoxDialog.icons[2]]: 'QUESTION',
	[l().messageBoxDialog.icons[3]]: 'WARNING',
	[l().messageBoxDialog.icons[4]]: 'ERROR'
} as const));

const title = ref('');
const text = ref('');
const icon = ref(l().messageBoxDialog.icons[0]);
const type = ref(l().messageBoxDialog.types[0]);
const shown = ref(false);

const onSubmit = () => {
	emit('submit', {
		title: title.value,
		text: text.value,
		icon: iconOptionsMap.value[icon.value],
		type: typeOptionsMap.value[type.value]
	});
	hide();
};
const hide = () => shown.value = false;
const reset = () => {
	title.value = '';
	text.value = '';
	icon.value = l().messageBoxDialog.icons[0];
	type.value = l().messageBoxDialog.types[0];
};
const show = () => {
	shown.value = true;
	reset();
};
watch(l, reset);

defineExpose({ show, hide });
</script>

<template>
  <p-dialog
    v-model:visible="shown"
    modal
  >
    <template #header>
      <div class="p-dialog-title">
        {{ l().messageBoxDialog.title }}
      </div>
    </template>
    <div class="flex-col">
      <span style="display: block">{{ l().messageBoxDialog.typesLabel }}</span>
      <p-select-button
        v-model="type"
        :options="Object.keys(typeOptionsMap)"
        aria-labelledby="basic"
        class="ui-block-b"
      />
      <p-input-text
        v-model="title"
        :placeholder="l().messageBoxDialog.titlePlaceholder"
        class="ui-block-b"
        style="margin-top: 8px"
        @submit="onSubmit"
      />
      <p-input-text
        v-model="text"
        :placeholder="l().messageBoxDialog.textPlaceholder"
        class="ui-block-b"
        @submit="onSubmit"
      />
      <span style="display: block; margin-top: 4px">{{ l().messageBoxDialog.iconsLabel }}</span>
      <p-select-button
        v-model="icon"
        :options="Object.keys(iconOptionsMap)"
        aria-labelledby="basic"
      />
    </div>
    <template #footer>
      <p-btn
        :label="l().cancel"
        class="p-button-text"
        @click="hide"
      />
      <p-btn
        :label="l().ok"
        @click="onSubmit"
      />
    </template>
  </p-dialog>
</template>