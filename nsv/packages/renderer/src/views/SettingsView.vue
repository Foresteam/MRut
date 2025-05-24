<script lang="ts" setup>
import { usePreferencesStore } from '@/store/preferences';
import { mapActions, storeToRefs } from 'pinia';
import PToggleSwitch from 'primevue/inputswitch';
import { computed, ref } from 'vue';
import PPanel from 'primevue/panel';
import PBtn from 'primevue/button';

const pending = ref(false);

const preferences = usePreferencesStore();
const { l } = preferences;
const { languageRussian } = storeToRefs(preferences);

const clearDb = async () => {
	pending.value = true;
	await window.backend.clearDb();
	pending.value = false;
};
</script>

<template>
  <div class="flex-col h-full">
    <p-panel class="ui-block">
      <template #header>
        {{ l().main }}
      </template>
      <div class="flex-col gap-l">
        <div class="flex-row items-center gap-m">
          <p-toggle-switch v-model="languageRussian" />
          {{ l().language }}
        </div>
        <div class="flex-row">
          <p-btn
            :label="l().settingsTab.resetDb"
            :title="l().settingsTab.resetDbTooltip"
            :loading="pending"
            @click="clearDb"
          />
        </div>
      </div>
    </p-panel>
  </div>
</template>

<style></style>