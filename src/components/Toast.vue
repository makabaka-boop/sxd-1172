<script setup>
defineProps({
  toast: { type: Object, default: null }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="toast" class="toast" :class="toast.type">{{ toast.msg }}</div>
  </Teleport>
</template>
