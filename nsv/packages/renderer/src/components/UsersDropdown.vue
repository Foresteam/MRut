<script lang="ts" setup>
import User from '@/components/UserCard.vue';
import PDropdown from 'primevue/dropdown';
import { useGeneralStore } from '@/store/general';
import { storeToRefs } from 'pinia';
import { IUser } from '$types/Common';
import { usePreferencesStore } from '@/store/preferences';

const emit = defineEmits<{ (e: 'update:modelValue', value: IUser): void }>();
defineProps<{
  modelValue: IUser | null
}>();

const store = useGeneralStore();

const { connectedUsers } = storeToRefs(store);
const { l } = usePreferencesStore();
</script>

<template>
  <p-dropdown
    :model-value="modelValue"
    :options="connectedUsers"
    style="max-width: 100%; overflow: hidden;"
    @update:model-value="(v: any) => emit('update:modelValue', v as IUser)"
  >
    <template #value="slotProps">
      <User
        v-if="slotProps.value"
        :user="slotProps.value"
      />
      <div v-else>
        <div>{{ l().emptyUser[0] }}</div>
        <div>{{ l().emptyUser[1] }}</div>
      </div>
    </template>
    <template #option="slotProps">
      <User :user="slotProps.option" />
    </template>
  </p-dropdown>
</template>