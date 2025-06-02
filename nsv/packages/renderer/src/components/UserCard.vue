<template>
  <div class="user">
    <OnlineIndicator :value="user.online" />
    <div
      style="overflow: hidden;"
      class="content"
    >
      <div style=" word-wrap: break-word;">
        {{ user.name || user.hostname }} #{{ user.id }}
      </div>
      <div>
        {{ user.address }}{{ user.username ? ` (${user.username})` : '' }}
      </div>
    </div>
    <!-- <p-btn-toggle
            onIcon="pi pi-check"
            offIcon="pi pi-times"
            v-model="slotProps.option.connected"
            class="p-button-rounded"
        /> -->
    <LoaderCircle
      v-if="user.processing"
      size="32px"
      color="var(--primary-color)"
    />
  </div>
</template>

<script lang="ts" setup>
import OnlineIndicator from '@/components/OnlineIndicator.vue';
import LoaderCircle from '@/components/LoaderCircle.vue';
import type { IUser } from '$types/Common';

defineProps<{ user: IUser }>();
</script>


<style scoped>
.user {
  text-align: left;
  display: flex;
  align-items: center;
  max-width: 100%;
}

.user>.content {
  display: flex;
  flex-flow: column;
  margin-left: 7pt;
  flex-grow: 1;
}
</style>