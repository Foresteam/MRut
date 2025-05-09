<template>
  <div
    class="p-tabmenuitem"
    role="tab"
  >
    <div
      class="p-menuitem-link"
      role="presentation"
      style="background: transparent"
      @click="() => go(item.to as string)"
    >
      <span class="p-menuitem-text">
        {{ item.label }}
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { MenuItem } from 'primevue/menuitem';

defineProps<{ item: MenuItem }>();
const go = (to: string) => location.href = `#${to}`;
</script>

<style lang="sass" scoped>
.p-menuitem-link
	cursor: pointer
.p-menuitem-text
	white-space: nowrap
</style>