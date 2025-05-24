<script lang="ts" setup>
import PInputText from 'primevue/inputtext';
import PBtn from 'primevue/button';
import PDialog from 'primevue/dialog';
import { ref } from 'vue';
import { usePreferencesStore } from '@/store/preferences';

const emit = defineEmits<{ (e: 'submit', value: string): any }>();
const props = withDefaults(defineProps<{
  title?: string;
  query: string;
  initialValue?: string;
  helpText?: string;
}>(), {
	title: 'Input',
});

const { l } = usePreferencesStore();

const value = ref('');
const shown = ref(false);

const onSubmit = () => {
	emit('submit', value.value);
	hide();
};
const hide = () => shown.value = false;
const show = () => {
	shown.value = true;
	value.value = props.initialValue || '';
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
        {{ title }}
      </div>
    </template>
    <div class="flex-col">
      <!-- <div style="margin: 15pt;"></div> -->
      <p-input-text
        v-model="value"
        :placeholder="query"
        style="width: 400px"
        @submit="onSubmit"
      />
      <small
        v-if="helpText"
        style="display: block"
      >{{ helpText }}</small>
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