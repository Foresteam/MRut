<template>
  <div class="user">
    <OnlineIndicator :value="user.online" />
    <div style="overflow: hidden;">
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
    <p-progress-spinner
      v-if="user.processing"
      stroke-width="5px"
    />
  </div>
</template>

<script lang="ts" setup>
import OnlineIndicator from '@/components/OnlineIndicator.vue';
import PProgressSpinner from 'primevue/progressspinner';
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

.user>div:nth-of-type(1) {
  display: flex;
  flex-flow: column;
  margin-left: 7pt;
  flex-grow: 1;
}

.user>div:nth-of-type(2) {
  width: 35px;
  height: 35px;
}
</style>