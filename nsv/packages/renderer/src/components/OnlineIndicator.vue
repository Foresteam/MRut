<template>
  <i :class="{ 'pi': true, 'pi-circle-fill': true, 'online': value }"></i>
</template>

<script lang="ts" setup>
defineProps<{ value?: boolean }>();
</script>

<style lang="scss" scoped>
i {
	color: var(--surface-d);
	text-shadow: 0px 0px 2px var(--primary-color-text);
	&.online {
		color: var(--success-color)
	}
}
</style>