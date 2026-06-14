<script setup>
import { computed } from 'vue'
import { STATUS_OPTIONS } from '../constants'
import { getColorMeta, getStatusMeta, riskLabel } from '../utils'
import CardEditor from './CardEditor.vue'
import CardDisplay from './CardDisplay.vue'
import TrackingTimeline from './TrackingTimeline.vue'

const props = defineProps({
  card: { type: Object, required: true },
  isEditing: { type: Boolean, default: false },
  isCreatingPinned: { type: Boolean, default: false },
  editingDraft: { type: Object, default: null },
  allSessions: { type: Array, default: () => [] },
  selected: { type: Boolean, default: false },
  duplicate: { type: Boolean, default: false },
  colorConflict: { type: Boolean, default: false },
  riskLevel: { type: String, default: 'low' },
  nightMode: { type: Boolean, default: false },
  editingInProgress: { type: Boolean, default: false },
  hasUnsaved: { type: Boolean, default: false },
  dragId: { type: String, default: null },
  dragOverId: { type: String, default: null },
  dragOverPos: { type: String, default: null },
  trackingRecords: { type: Array, default: () => [] },
  getTrackIcon: { type: Function, required: true },
  getTrackText: { type: Function, required: true }
})

const emit = defineEmits([
  'startEdit', 'saveEdit', 'cancelEdit', 'duplicate', 'delete',
  'quickSetStatus', 'toggleSelect',
  'dragStart', 'dragEnd', 'dragOver', 'drop'
])

const isPinned = computed(() => props.card.__pinned)
const cardClass = computed(() => ({
  editing: props.isEditing || props.isCreatingPinned,
  'card-pinned': isPinned.value,
  dragging: props.dragId === props.card.id,
  'drag-over-top': props.dragOverId === props.card.id && props.dragOverPos === 'top',
  'drag-over-bottom': props.dragOverId === props.card.id && props.dragOverPos === 'bottom',
  'has-risk-high': !isPinned.value && props.riskLevel === 'high',
  'has-risk-medium': !isPinned.value && props.riskLevel === 'medium',
  'has-risk-low': !isPinned.value && props.riskLevel === 'low',
  'night-issue': props.nightMode && (props.card.status !== 'recovered' || props.card.status === 'issue')
}))
</script>

<template>
  <div
    class="card-item"
    :class="cardClass"
    :draggable="!isPinned && !editingInProgress"
    @dragstart="emit('dragStart', $event, card.id)"
    @dragend="emit('dragEnd')"
    @dragover="emit('dragOver', $event, card.id)"
    @drop="emit('drop', $event, card.id)"
  >
    <div v-if="isPinned" style="padding:6px 14px;background:linear-gradient(90deg,#dbeafe,#eff6ff);font-size:12px;color:#1e40af;font-weight:500;border-bottom:1px solid #bfdbfe">
      {{ card.__pinnedLabel }}
    </div>

    <div class="card-header">
      <div class="card-head-left">
        <span class="drag-handle" :title="isPinned ? '新增中：保存后可拖拽排序' : '拖拽调整顺序'">⋮⋮</span>
        <input type="checkbox" class="card-checkbox"
          :checked="selected"
          :disabled="isPinned || editingInProgress"
          @change="emit('toggleSelect', card.id)" />
        <span class="card-no" :class="{ duplicate: !isPinned && duplicate }"
          :title="duplicate ? '⚠ 卡号重复' : '卡号'">
          {{ card.cardNo || '(未填)' }}
        </span>
        <span
          v-if="card.groupColor"
          class="color-tag"
          :style="{
            background: getColorMeta(card.groupColor)?.bg,
            color: getColorMeta(card.groupColor)?.fg,
            borderColor: (!isPinned && colorConflict) ? '#ef4444' : 'transparent'
          }"
          :title="(!isPinned && colorConflict) ? '⚠ 同场次颜色冲突' : '分组颜色'"
        >
          <span :style="{'display':'inline-block','width':'8px','height':'8px','border-radius':'50%','background':getColorMeta(card.groupColor)?.dot,'margin-right':'4px'}"></span>
          {{ getColorMeta(card.groupColor)?.label }}
        </span>
        <span class="session-tag" v-if="card.session">🎪 {{ card.session }}</span>
        <span class="status-tag" :class="getStatusMeta(card.status).cls">
          {{ getStatusMeta(card.status).label }}
        </span>
        <span title="风险等级" style="font-size:12px;color:var(--text-muted)" v-if="!isPinned">
          <span class="risk-dot" :class="'risk-' + riskLevel"></span>
          {{ riskLabel(riskLevel) }}
        </span>
      </div>
      <div class="card-head-right">
        <template v-if="isCreatingPinned || isEditing">
          <button class="primary sm" @click="emit('saveEdit')" :disabled="!hasUnsaved">💾 保存</button>
          <button class="sm" @click="emit('cancelEdit')">{{ hasUnsaved ? '取消' : '收起' }}</button>
        </template>
        <template v-else>
          <button class="sm" @click="emit('startEdit', card.id)" :disabled="editingInProgress">✏ 编辑</button>
          <button class="sm ghost" @click="emit('duplicate', card.id)" :disabled="editingInProgress">📋 复制分组</button>
          <button class="sm danger" @click="emit('delete', card.id)" :disabled="isCreatingPinned">🗑 删除</button>
        </template>
      </div>
    </div>

    <div class="card-body">
      <template v-if="(isCreatingPinned && editingDraft) || (isEditing && editingDraft)">
        <CardEditor
          :draft="editingDraft"
          :all-sessions="allSessions"
          :duplicate="duplicate"
        />
      </template>
      <template v-else>
        <CardDisplay :card="card" />
      </template>

      <TrackingTimeline
        v-if="!isCreatingPinned"
        :records="trackingRecords"
        :get-icon-fn="getTrackIcon"
        :format-text-fn="getTrackText"
        :card-id="card.id"
      />
    </div>

    <div class="card-footer">
      <div class="issue-notes">
        <span v-if="card.missingCorner && card.missingCorner.trim()" class="issue-note missing-corner" :title="card.missingCorner">
          📌 缺角/破损：{{ card.missingCorner }}
        </span>
        <span v-if="card.recycleNote && card.recycleNote.trim()" class="issue-note recycle-note" :title="card.recycleNote">
          🔄 回收备注：{{ card.recycleNote }}
        </span>
        <span v-if="!isPinned && duplicate" class="issue-note">
          ⚠ 卡号与其他卡重复
        </span>
        <span v-if="!isPinned && colorConflict" class="issue-note">
          ⚠ 同场次颜色冲突
        </span>
      </div>
      <div class="footer-actions" v-if="!isEditing && !isCreatingPinned">
        <button class="sm" @click="emit('quickSetStatus', card.id, 'pending')" :disabled="editingInProgress" title="标记为待发放">待发放</button>
        <button class="sm success" @click="emit('quickSetStatus', card.id, 'checked')" :disabled="editingInProgress" title="已签到">已签到</button>
        <button class="sm" style="background:#fef3c7;color:#92400e;border-color:#f59e0b"
          @click="emit('quickSetStatus', card.id, 'recovering')" :disabled="editingInProgress" title="待回收">待回收</button>
        <button class="sm danger" @click="emit('quickSetStatus', card.id, 'issue')" :disabled="editingInProgress" title="异常待核对">异常</button>
      </div>
    </div>
  </div>
</template>
