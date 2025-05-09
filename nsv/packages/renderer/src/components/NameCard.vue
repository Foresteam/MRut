<template>
  <div class="shift-em title">
    {{ TITLE }}
  </div>
</template>

<script lang="ts" setup>
const TITLE = 'MRut';
</script>

<style scoped>
div {
	background: var(--primary-color);
	padding-left: 7pt;
	padding-right: 7pt;
	color: var(--primary-color-text);
	display: flex;
	align-items: center;
}
</style>