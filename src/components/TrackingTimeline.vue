<script setup>
import { computed } from 'vue'
import { TRACKING_TYPE_LABELS } from '../constants'
import { formatTime } from '../utils'

const props = defineProps({
  records: { type: Array, default: () => [] },
  getIconFn: { type: Function, required: true },
  formatTextFn: { type: Function, required: true },
  cardId: { type: String, default: '' },
  collapse: { type: Boolean, default: true }
})

const visible = computed(() => props.collapse ? props.records.slice(0, 5) : props.records)
</script>

<template>
  <div class="tracking-timeline" v-if="records.length > 0">
    <div class="tracking-title">
      <span>📋 交接动态</span>
      <span class="tracking-count">{{ records.length }} 条记录</span>
    </div>
    <div class="tracking-list">
      <div v-for="r in visible" :key="r.id" class="tracking-item">
        <span class="tracking-icon">{{ getIconFn(r.type) }}</span>
        <div class="tracking-body">
          <div class="tracking-text">
            <span class="tracking-type-badge" :class="'ttype-' + r.type">
              {{ TRACKING_TYPE_LABELS[r.type] || r.type }}
            </span>
            <span class="tracking-desc">{{ formatTextFn(r) }}</span>
          </div>
          <div class="tracking-time">{{ formatTime(r.createdAt) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
