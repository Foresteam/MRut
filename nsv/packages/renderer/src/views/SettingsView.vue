<script lang="ts" setup>
import { usePreferencesStore } from '@/store/preferences';
import { mapActions, storeToRefs } from 'pinia';
import PToggleSwitch from 'primevue/inputswitch';
import { computed, ref } from 'vue';
import PPanel from 'primevue/panel';

const preferences = usePreferencesStore();
const { l } = preferences;
const { languageRussian } = storeToRefs(preferences);
</script>

<template>
  <div class="flex-col h-full">
    <p-panel class="ui-block">
      <template #header>
        {{ l().main }}
      </template>
      <div class="flex-row items-center gap-m">
        <p-toggle-switch v-model="languageRussian" />
        {{ l().language }}
      </div>
    </p-panel>
  </div>
</template>

<style>
</style>