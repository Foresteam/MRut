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
const openConfigFolder = async () => {
	pending.value = true;
	await window.backend.openConfigFolder();
	pending.value = false;
};
const updateCertificates = async () => {
	pending.value = true;
	await window.backend.updateCertificates();
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
        <div class="flex-row gap-l">
          <p-btn
            icon="pi pi-database"
            :label="l().settingsTab.resetDb"
            :title="l().settingsTab.resetDbTooltip"
            :loading="pending"
            @click="clearDb"
          />
          <p-btn
            icon="pi pi-folder"
            :label="l().settingsTab.openConfigFolder"
            :title="l().settingsTab.openConfigFolderTooltip"
            :loading="pending"
            @click="openConfigFolder"
          />
          <p-btn
            icon="pi pi-folder"
            :label="l().settingsTab.updateCertificates"
            :title="l().settingsTab.updateCertificatesTooltip"
            :loading="pending"
            @click="updateCertificates"
          />
        </div>
        <div class="flex-row">
        </div>
      </div>
    </p-panel>
  </div>
</template>

<style></style>