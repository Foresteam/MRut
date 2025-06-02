<script setup lang="ts">
withDefaults(defineProps<{ size: string; color?: string; }>(), { color: '#fff' }); </script>
<template>
  <div class="lds-ring">
    <div />
    <div />
    <div />
    <div />
  </div>
</template>
<style lang="scss" scoped>
.lds-ring {
  display: inline-block;
  position: relative;
  height: v-bind(size);
  aspect-ratio: 1;
}

.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: calc(v-bind(size) - v-bind(size) / 8 / 2 * 2); // 80% = size - 2 * margin
  height: calc(v-bind(size) - v-bind(size) / 8 / 2 * 2);
  margin: v-bind(size) / 8 / 2;
  border: calc(v-bind(size) / 8) solid v-bind(color);
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: v-bind(color) transparent transparent transparent;
}

.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}

.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}

.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}

@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
