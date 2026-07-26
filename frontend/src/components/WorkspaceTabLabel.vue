<script setup>
defineProps({
  icon: {
    type: Object,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <span class="workspace-tab-label">
    <n-icon class="workspace-tab-label__icon" :component="icon" />
    <span class="workspace-tab-label__text">{{ label }}</span>
  </span>
</template>
