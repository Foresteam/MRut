<script lang="ts" setup>
import PBtn from 'primevue/button';

export interface IMiscButton {
  label: string;
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
      :label="button.label"
      :icon="button.icon"
      :loading="loading"
      @click="button.callback"
    />
  </div>
</template>
