<script setup>
defineProps({
  allSelected: { type: Boolean, default: false },
  someSelected: { type: Boolean, default: false },
  selectedCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  editingInProgress: { type: Boolean, default: false }
})

const emit = defineEmits(['toggleAll', 'setStatus', 'clear'])
</script>

<template>
  <section v-if="totalCount > 0" class="batch-bar">
    <div class="batch-info" style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" class="card-checkbox"
        :checked="allSelected"
        :indeterminate.prop="someSelected"
        :disabled="editingInProgress"
        @change="emit('toggleAll')" />
      <span>
        <template v-if="editingInProgress">（编辑中无法批量操作，请先保存或取消）</template>
        <template v-else-if="someSelected || allSelected">✓ 已选择 {{ selectedCount }} / {{ totalCount }} 张</template>
        <template v-else>（勾选后可批量操作）</template>
      </span>
    </div>
    <div class="batch-actions">
      <button class="sm" @click="emit('setStatus', 'pending')"
        :disabled="selectedCount === 0 || editingInProgress">标记待发放</button>
      <button class="sm success" @click="emit('setStatus', 'checked')"
        :disabled="selectedCount === 0 || editingInProgress">标记已签到</button>
      <button class="sm" style="background:#fcd34d;color:#92400e;border-color:#f59e0b"
        @click="emit('setStatus', 'recovering')"
        :disabled="selectedCount === 0 || editingInProgress">标记待回收</button>
      <button class="sm danger" @click="emit('setStatus', 'issue')"
        :disabled="selectedCount === 0 || editingInProgress">标记异常待核对</button>
      <button class="sm ghost" @click="emit('clear')" v-if="selectedCount > 0"
        :disabled="editingInProgress">取消选择</button>
    </div>
  </section>
</template>
