<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 40,
  },
})
</script>

<template>
  <span class="brand-mark" :style="{ '--brand-mark-size': `${size}px` }" aria-hidden="true">
    <img src="/logo.svg" alt="" />
  </span>
</template>

<style scoped>
.brand-mark {
  display: inline-grid;
  flex: 0 0 auto;
  width: var(--brand-mark-size);
  height: var(--brand-mark-size);
  place-items: center;
}

.brand-mark img {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
