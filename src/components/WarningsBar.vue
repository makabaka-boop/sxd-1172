<script setup>
defineProps({
  warnings: { type: Array, default: () => [] }
})
</script>

<template>
  <div v-if="warnings.length > 0" class="warnings-bar"
    :class="{ danger: warnings.some(w => w.level === 'danger') }">
    <div class="warn-title">⚠ 系统检查提示（{{ warnings.length }} 项）</div>
    <ul>
      <li v-for="(w, i) in warnings" :key="i">{{ w.text }}</li>
    </ul>
  </div>
</template>
