<script setup>
defineProps({
  modal: { type: Object, default: null }
})

const emit = defineEmits(['cancel', 'discard', 'save'])
</script>

<template>
  <Teleport to="body">
    <div v-if="modal" class="modal-mask" @click.self="emit('cancel')">
      <div class="modal-box">
        <div class="modal-head">{{ modal.title }}</div>
        <div class="modal-body">{{ modal.message }}</div>
        <div class="modal-foot">
          <button class="sm" @click="emit('cancel')">取消</button>
          <button class="sm" @click="emit('discard')">丢弃修改</button>
          <button class="sm primary" @click="emit('save')">先保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
