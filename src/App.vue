<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useCards } from './composables/useCards'
import { useTracking } from './composables/useTracking'
import { useFilters } from './composables/useFilters'
import WarningsBar from './components/WarningsBar.vue'
import FilterPanel from './components/FilterPanel.vue'
import BatchBar from './components/BatchBar.vue'
import CardItem from './components/CardItem.vue'
import OverviewPanel from './components/OverviewPanel.vue'
import Toast from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import { STATUS_OPTIONS } from './constants'

const cardsStore = useCards()
const tracking = useTracking()
const filtersStore = useFilters(
  cardsStore.cards,
  cardsStore.getRiskLevel,
  cardsStore.duplicateCardNos,
  cardsStore.colorConflicts,
  tracking
)

const toast = ref(null)
const confirmModal = ref(null)
const dragId = ref(null)
const dragOverId = ref(null)
const dragOverPos = ref(null)

onMounted(() => {
  cardsStore.onCardChange((oldC, newC) => {
    tracking.processCardChange(oldC, newC)
  })
  cardsStore.onCardCreate((c) => {
    tracking.processCardCreate(c)
  })
  cardsStore.onCardDelete((c) => {
    tracking.processCardDelete(c)
  })
})

function showToast(msg, type = 'info') {
  toast.value = { msg, type }
  setTimeout(() => { toast.value = null }, 2000)
}

function getStatusLabel(val) {
  const opt = STATUS_OPTIONS.find(o => o.value === val)
  return opt?.label || val
}

function requireSavedOrConfirm(andThen, actionDesc = '此操作') {
  if (cardsStore.editingInProgress.value && cardsStore.hasUnsavedChanges.value) {
    confirmModal.value = {
      title: '有未保存的修改',
      message: `${actionDesc}前需要先处理当前编辑的未保存内容。`,
      onSave: () => { saveEdit(); confirmModal.value = null; andThen?.() },
      onDiscard: () => { cancelEdit(); confirmModal.value = null; andThen?.() },
      onCancel: () => { confirmModal.value = null }
    }
    return false
  }
  return true
}

function addCard(copyFromLast = false) {
  if (cardsStore.editingInProgress.value) {
    if (!requireSavedOrConfirm(() => addCard(copyFromLast), '新增卡')) return
    return
  }
  cardsStore.addCard(copyFromLast)
  showToast('请填写后保存（取消或刷新不会留下空记录）', 'info')
}

function startEdit(id) {
  if (cardsStore.isCreating.value) {
    if (!requireSavedOrConfirm(() => startEdit(id), '切换到其他卡')) return
    return
  }
  if (cardsStore.editingId.value && cardsStore.editingId.value !== id) {
    if (!requireSavedOrConfirm(() => startEdit(id), '切换到其他卡')) return
    return
  }
  cardsStore.startEdit(id)
}

function saveEdit() {
  const wasCreating = cardsStore.isCreating.value
  cardsStore.saveEdit()
  showToast(wasCreating ? '新增并保存成功' : '已保存', 'success')
}

function cancelEdit() {
  const wasCreating = cardsStore.isCreating.value
  cardsStore.cancelEdit()
  if (wasCreating) showToast('已取消新增（未留下记录）', 'info')
}

function deleteCard(id) {
  cardsStore.deleteCard(id)
  showToast('已删除', 'info')
}

function duplicateCard(id) {
  if (cardsStore.editingInProgress.value) {
    if (!requireSavedOrConfirm(() => duplicateCard(id), '复制分组')) return
    return
  }
  cardsStore.duplicateCard(id)
  showToast('已复制（可点击编辑修改卡号）', 'success')
}

function quickSetStatus(id, status) {
  if (cardsStore.editingInProgress.value) {
    showToast('请先完成或取消当前编辑再快速改状态', 'error')
    return
  }
  cardsStore.quickSetStatus(id, status)
  showToast(`已标记为「${getStatusLabel(status)}」`, 'success')
}

function toggleSelect(id) {
  if (cardsStore.editingInProgress.value) {
    showToast('请先完成或取消当前编辑再做批量选择', 'error')
    return
  }
  cardsStore.toggleSelect(id)
}

function clearSelection() {
  if (cardsStore.editingInProgress.value) {
    showToast('请先完成或取消当前编辑', 'error')
    return
  }
  cardsStore.clearSelection()
}

function toggleSelectAll() {
  if (cardsStore.editingInProgress.value) {
    showToast('请先完成或取消当前编辑再做批量操作', 'error')
    return
  }
  if (allSelected.value) {
    selectableCards.value.forEach(c => cardsStore.selectedIds.value.delete(c.id))
  } else {
    selectableCards.value.forEach(c => cardsStore.selectedIds.value.add(c.id))
  }
  cardsStore.selectedIds.value = new Set(cardsStore.selectedIds.value)
}

function batchSetStatus(status) {
  if (cardsStore.editingInProgress.value) {
    showToast('请先完成或取消当前编辑再做批量操作', 'error')
    return
  }
  const count = cardsStore.batchSetStatus(status, cardsStore.selectedIds.value)
  if (count > 0) {
    showToast(`已将 ${count} 张标记为「${getStatusLabel(status)}」`, 'success')
  }
}

function setFilter(key, value) {
  const andThen = () => { filtersStore.setFilter(key, value) }
  requireSavedOrConfirm(andThen, '修改筛选条件')
}

function setBacklog(val) {
  filtersStore.backlogThreshold.value = val
}

function clearFilters() {
  const andThen = () => { filtersStore.clearFilters() }
  requireSavedOrConfirm(andThen, '清空筛选')
}

function setNightMode(val) {
  const andThen = () => { filtersStore.setNightMode(val) }
  requireSavedOrConfirm(andThen, val ? '切换到晚场模式' : '切换回正常模式')
}

function onDragStart(e, id) {
  if (cardsStore.editingInProgress.value) {
    e.preventDefault()
    showToast('请先完成或取消当前编辑再排序', 'error')
    return
  }
  dragId.value = id
  e.dataTransfer.effectAllowed = 'move'
  try { e.dataTransfer.setData('text/plain', id) } catch (_) {}
}

function onDragEnd() {
  dragId.value = null
  dragOverId.value = null
  dragOverPos.value = null
}

function onDragOver(e, id) {
  if (cardsStore.editingInProgress.value) return
  e.preventDefault()
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const mid = rect.top + rect.height / 2
  const pos = e.clientY < mid ? 'top' : 'bottom'
  if (dragOverId.value !== id || dragOverPos.value !== pos) {
    dragOverId.value = id
    dragOverPos.value = pos
  }
}

function onDrop(e, targetId) {
  e.preventDefault()
  if (cardsStore.editingInProgress.value) { onDragEnd(); return }
  if (!dragId.value || dragId.value === targetId) { onDragEnd(); return }
  cardsStore.reorderCard(dragId.value, targetId, dragOverPos.value)
  showToast('顺序已调整', 'info')
  onDragEnd()
}

const selectableCards = computed(() => filteredCards.value.filter(c => !c.__pinned))
const allSelected = computed(() => {
  return selectableCards.value.length > 0 &&
    selectableCards.value.every(c => cardsStore.selectedIds.value.has(c.id))
})
const someSelected = computed(() => {
  return selectableCards.value.some(c => cardsStore.selectedIds.value.has(c.id)) && !allSelected.value
})
const selectedCount = computed(() => {
  return selectableCards.value.filter(c => cardsStore.selectedIds.value.has(c.id)).length
})

const filteredCards = computed(() => {
  let pinned = null
  let pinnedId = null
  if (cardsStore.isCreating.value && cardsStore.editingDraft.value) {
    pinned = { ...cardsStore.editingDraft.value, __pinned: true, __pinnedLabel: '🔒 新增中（尚未保存）' }
    pinnedId = pinned.id
  } else if (cardsStore.editingId.value) {
    const card = cardsStore.cards.value.find(c => c.id === cardsStore.editingId.value)
    if (card) {
      pinned = { ...card, __pinned: true, __pinnedLabel: '🔒 正在编辑（已钉到顶部，不受当前筛选影响）' }
      pinnedId = pinned.id
    }
  }
  let list = filtersStore.applyFilters(cardsStore.cards.value)
  if (pinned) {
    list = [pinned, ...list.filter(c => c.id !== pinnedId)]
  }
  return list
})

function getCardTrackingRecords(cardId) {
  return tracking.getRecordsByCard(cardId, 5)
}

function handleOverviewFilter({ key, value }) {
  setFilter(key, value)
}
</script>

<template>
  <div class="app-shell">
    <header class="page-header">
      <div class="page-title">
        <h1>📇 签到卡整理台</h1>
        <span class="subtitle">纯前端 · localStorage 持久化</span>
      </div>
      <div class="header-actions">
        <span v-if="cardsStore.hasUnsavedChanges.value" class="unsaved-flag">⚠ 有未保存的修改</span>
        <div class="mode-switch" :class="{ 'night-active': filtersStore.nightMode.value }">
          <button :class="{ active: !filtersStore.nightMode.value }" @click="setNightMode(false)">
            ☀ 正常模式
          </button>
          <button :class="{ active: filtersStore.nightMode.value }" @click="setNightMode(true)">
            🌙 晚场核对
          </button>
        </div>
        <button class="ghost sm" @click="addCard(false)" :disabled="cardsStore.editingInProgress.value">＋ 新增</button>
        <button class="primary sm" @click="addCard(true)" :disabled="cardsStore.editingInProgress.value">＋ 复制上一组新增</button>
      </div>
    </header>

    <WarningsBar :warnings="filtersStore.systemWarnings.value" />

    <FilterPanel
      :filters="filtersStore.filters.value"
      :all-sessions="filtersStore.allSessions.value"
      :all-responsibles="filtersStore.allResponsibles.value"
      :backlog-threshold="filtersStore.backlogThreshold.value"
      :stats="cardsStore.stats.value"
      :showing="filteredCards.filter(c => !c.__pinned).length"
      :night-mode="filtersStore.nightMode.value"
      @set-filter="setFilter"
      @set-backlog="setBacklog"
      @clear="clearFilters"
    />

    <OverviewPanel
      :cards="cardsStore.cards.value"
      :tracking="tracking"
      :current-filter="filtersStore.filters.value"
      @apply-filter="handleOverviewFilter"
    />

    <BatchBar
      :all-selected="allSelected"
      :some-selected="someSelected"
      :selected-count="selectedCount"
      :total-count="selectableCards.length"
      :editing-in-progress="cardsStore.editingInProgress.value"
      @toggle-all="toggleSelectAll"
      @set-status="batchSetStatus"
      @clear="clearSelection"
    />

    <section class="cards-list">
      <div v-if="filteredCards.length === 0" class="empty-state">
        <div class="big-icon">📭</div>
        <h3>{{ cardsStore.cards.value.length === 0 ? '还没有任何签到卡' : '没有符合筛选条件的记录' }}</h3>
        <p>
          <template v-if="cardsStore.cards.value.length === 0">点击右上角「新增」开始录入第一张卡</template>
          <template v-else-if="cardsStore.editingInProgress.value">当前有编辑中的卡已钉在顶部，完成或取消后可看到列表</template>
          <template v-else>尝试修改筛选条件，或切换到晚场模式</template>
        </p>
      </div>

      <CardItem
        v-for="card in filteredCards"
        :key="card.id + (card.__pinned ? '-pinned' : '')"
        :card="card"
        :is-editing="cardsStore.editingId.value === card.id"
        :is-creating-pinned="cardsStore.isCreating.value && card.__pinned"
        :editing-draft="cardsStore.editingDraft.value"
        :all-sessions="filtersStore.allSessions.value"
        :selected="cardsStore.selectedIds.value.has(card.id)"
        :duplicate="!card.__pinned && cardsStore.duplicateCardNos.value.has(card.id)"
        :color-conflict="!card.__pinned && cardsStore.colorConflicts.value.has(card.id)"
        :risk-level="cardsStore.getRiskLevel(card)"
        :night-mode="filtersStore.nightMode.value"
        :editing-in-progress="cardsStore.editingInProgress.value"
        :has-unsaved="cardsStore.hasUnsavedChanges.value"
        :drag-id="dragId"
        :drag-over-id="dragOverId"
        :drag-over-pos="dragOverPos"
        :tracking-records="card.__pinned ? [] : getCardTrackingRecords(card.id)"
        :get-track-icon="tracking.getRecordIcon"
        :get-track-text="tracking.formatRecordText"
        @start-edit="startEdit"
        @save-edit="saveEdit"
        @cancel-edit="cancelEdit"
        @duplicate="duplicateCard"
        @delete="deleteCard"
        @quick-set-status="quickSetStatus"
        @toggle-select="toggleSelect"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @drag-over="onDragOver"
        @drop="onDrop"
      />
    </section>

    <Toast :toast="toast" />
    <ConfirmModal
      :modal="confirmModal"
      @cancel="confirmModal?.onCancel?.()"
      @discard="confirmModal?.onDiscard?.()"
      @save="confirmModal?.onSave?.()"
    />
  </div>
</template>
