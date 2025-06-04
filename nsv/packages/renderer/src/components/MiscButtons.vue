<script lang="ts" setup>
import PBtn from 'primevue/button';

export interface IMiscButton {
  label: string | (() => string);
  icon?: string;
  callback?: () => any;
}

defineProps<{ buttons: IMiscButton[]; loading?: boolean; }>();
</script>

<template>
  <div class="misc-buttons">
    <p-btn
      v-for="[index, button] of Object.entries(buttons)"
      :key="index"
      :label="typeof button.label === 'function' ? button.label() : button.label"
      :icon="button.icon"
      :loading="loading"
      @click="button.callback"
    />
  </div>
</template>
