<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const STORAGE_KEY = 'signin_cards_v1'
const FILTER_KEY = 'signin_filters_v1'
const MODE_KEY = 'signin_mode_v1'

const STATUS_OPTIONS = [
  { value: 'pending', label: '待发放', cls: 'status-pending' },
  { value: 'checked', label: '已签到', cls: 'status-checked' },
  { value: 'recovering', label: '待回收', cls: 'status-recovering' },
  { value: 'recovered', label: '已回收', cls: 'status-recovered' },
  { value: 'issue', label: '异常待核对', cls: 'status-issue' }
]

const COLOR_OPTIONS = [
  { value: 'red', label: '红色', bg: '#fee2e2', fg: '#991b1b', dot: '#ef4444' },
  { value: 'orange', label: '橙色', bg: '#ffedd5', fg: '#9a3412', dot: '#f97316' },
  { value: 'yellow', label: '黄色', bg: '#fef9c3', fg: '#854d0e', dot: '#eab308' },
  { value: 'green', label: '绿色', bg: '#dcfce7', fg: '#166534', dot: '#22c55e' },
  { value: 'cyan', label: '青色', bg: '#cffafe', fg: '#155e75', dot: '#06b6d4' },
  { value: 'blue', label: '蓝色', bg: '#dbeafe', fg: '#1e3a8a', dot: '#3b82f6' },
  { value: 'purple', label: '紫色', bg: '#ede9fe', fg: '#5b21b6', dot: '#8b5cf6' },
  { value: 'pink', label: '粉色', bg: '#fce7f3', fg: '#9d174d', dot: '#ec4899' }
]

const SESSION_PRESETS = ['早场', '午场', '晚场', '夜场', 'VIP专场']

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function createEmptyCard(preset = {}) {
  return {
    id: uid(),
    cardNo: preset.cardNo ?? '',
    session: preset.session ?? '',
    groupColor: preset.groupColor ?? '',
    status: preset.status ?? 'pending',
    missingCorner: preset.missingCorner ?? '',
    recycleNote: preset.recycleNote ?? '',
    responsible: preset.responsible ?? '',
    order: preset.order ?? Date.now(),
    createdAt: Date.now()
  }
}

const cards = ref([])
const editingId = ref(null)
const editingDraft = ref(null)
const originalSnapshot = ref(null)
const selectedIds = ref(new Set())
const nightMode = ref(false)
const dragId = ref(null)
const dragOverId = ref(null)
const dragOverPos = ref(null)
const toast = ref(null)
const confirmModal = ref(null)
const backlogThreshold = ref(5)

const filters = ref({
  session: '',
  responsible: '',
  status: '',
  risk: ''
})

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) cards.value = parsed
    }
  } catch (e) { console.warn('load error', e) }
  try {
    const f = localStorage.getItem(FILTER_KEY)
    if (f) filters.value = { ...filters.value, ...JSON.parse(f) }
    const m = localStorage.getItem(MODE_KEY)
    if (m) nightMode.value = m === 'night'
  } catch (e) {}
})

watch(cards, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

watch(filters, (val) => {
  localStorage.setItem(FILTER_KEY, JSON.stringify(val))
}, { deep: true })

watch(nightMode, (val) => {
  localStorage.setItem(MODE_KEY, val ? 'night' : 'day')
})

function showToast(msg, type = 'info') {
  toast.value = { msg, type }
  setTimeout(() => { toast.value = null }, 2000)
}

const allSessions = computed(() => {
  const s = new Set()
  cards.value.forEach(c => { if (c.session) s.add(c.session) })
  return [...s]
})
const allResponsibles = computed(() => {
  const s = new Set()
  cards.value.forEach(c => { if (c.responsible) s.add(c.responsible) })
  return [...s]
})

const duplicateCardNos = computed(() => {
  const map = new Map()
  cards.value.forEach(c => {
    const k = (c.cardNo || '').trim()
    if (!k) return
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(c.id)
  })
  const dup = new Set()
  map.forEach(arr => { if (arr.length > 1) arr.forEach(id => dup.add(id)) })
  return dup
})

const colorConflicts = computed(() => {
  const bad = new Set()
  const bySession = new Map()
  cards.value.forEach(c => {
    if (!c.session || !c.groupColor) return
    const key = c.session + '||' + c.groupColor
    if (!bySession.has(key)) bySession.set(key, [])
    bySession.get(key).push(c.id)
  })
  bySession.forEach(arr => {
    if (arr.length > 1) arr.forEach(id => bad.add(id))
  })
  return bad
})

function getRiskLevel(card) {
  let score = 0
  if (duplicateCardNos.value.has(card.id)) score += 3
  if (colorConflicts.value.has(card.id)) score += 2
  if (!card.responsible || !card.responsible.trim()) score += 2
  if (card.status === 'issue') score += 3
  if ((card.status === 'recovering' || card.status === 'issue') &&
      (card.missingCorner || card.recycleNote)) score += 1
  if (card.missingCorner && card.missingCorner.trim()) score += 1
  if (score >= 4) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
}

const systemWarnings = computed(() => {
  const w = []
  if (duplicateCardNos.value.size > 0) {
    w.push({ level: 'danger', text: `卡号重复：涉及 ${duplicateCardNos.value.size} 张卡，请核对` })
  }
  if (colorConflicts.value.size > 0) {
    w.push({ level: 'danger', text: `同场次分组颜色冲突：${colorConflicts.value.size} 处` })
  }
  const noResp = cards.value.filter(c => !c.responsible || !c.responsible.trim()).length
  if (noResp > 0) {
    w.push({ level: 'warning', text: `责任人空缺：${noResp} 张卡未指定负责人` })
  }
  const backlog = cards.value.filter(c => c.status === 'recovering').length
  if (backlog >= backlogThreshold.value) {
    w.push({ level: 'warning', text: `待回收积压：当前 ${backlog} 张待回收（阈值 ${backlogThreshold.value}）` })
  }
  const issue = cards.value.filter(c => c.status === 'issue').length
  if (issue > 0) {
    w.push({ level: 'danger', text: `异常待核对：${issue} 张卡需要跟进` })
  }
  return w
})

const filteredCards = computed(() => {
  let list = [...cards.value].sort((a, b) => a.order - b.order)
  if (filters.value.session) {
    list = list.filter(c => c.session === filters.value.session)
  }
  if (filters.value.responsible) {
    list = list.filter(c => c.responsible === filters.value.responsible)
  }
  if (filters.value.status) {
    list = list.filter(c => c.status === filters.value.status)
  }
  if (filters.value.risk) {
    list = list.filter(c => getRiskLevel(c) === filters.value.risk)
  }
  if (nightMode.value) {
    list = list.filter(c => {
      const hasIssue = c.status === 'issue' ||
        duplicateCardNos.value.has(c.id) ||
        colorConflicts.value.has(c.id) ||
        (c.missingCorner && c.missingCorner.trim()) ||
        (c.recycleNote && c.recycleNote.trim()) ||
        !c.responsible || !c.responsible.trim()
      return c.status !== 'recovered' || hasIssue
    })
  }
  return list
})

const hasUnsavedChanges = computed(() => {
  if (!editingDraft.value || !originalSnapshot.value) return false
  return JSON.stringify(normalize(editingDraft.value)) !== JSON.stringify(normalize(originalSnapshot.value))
})

function normalize(o) {
  return {
    cardNo: o.cardNo,
    session: o.session,
    groupColor: o.groupColor,
    status: o.status,
    missingCorner: o.missingCorner,
    recycleNote: o.recycleNote,
    responsible: o.responsible
  }
}

const stats = computed(() => ({
  total: cards.value.length,
  pending: cards.value.filter(c => c.status === 'pending').length,
  checked: cards.value.filter(c => c.status === 'checked').length,
  recovering: cards.value.filter(c => c.status === 'recovering').length,
  recovered: cards.value.filter(c => c.status === 'recovered').length,
  issue: cards.value.filter(c => c.status === 'issue').length,
  showing: filteredCards.value.length
}))

const allSelected = computed(() => {
  return filteredCards.value.length > 0 &&
    filteredCards.value.every(c => selectedIds.value.has(c.id))
})
const someSelected = computed(() => {
  return filteredCards.value.some(c => selectedIds.value.has(c.id)) && !allSelected.value
})
const selectedCount = computed(() => {
  return filteredCards.value.filter(c => selectedIds.value.has(c.id)).length
})

function addCard(copyFromLast = false) {
  if (hasUnsavedChanges.value) {
    confirmModal.value = {
      title: '有未保存的修改',
      message: '当前编辑的签到卡还有未保存内容，是否先保存？',
      onSave: () => { saveEdit(); confirmModal.value = null; addCard(copyFromLast) },
      onDiscard: () => { cancelEdit(); confirmModal.value = null; addCard(copyFromLast) },
      onCancel: () => { confirmModal.value = null }
    }
    return
  }
  const preset = {}
  if (copyFromLast && cards.value.length > 0) {
    const last = [...cards.value].sort((a, b) => a.order - b.order)[cards.value.length - 1]
    preset.session = last.session
    preset.groupColor = last.groupColor
    preset.responsible = last.responsible
  }
  const card = createEmptyCard(preset)
  card.order = cards.value.length > 0
    ? Math.max(...cards.value.map(c => c.order)) + 100
    : 100
  cards.value.push(card)
  startEdit(card.id)
  showToast('已新增签到卡', 'success')
}

function startEdit(id) {
  if (hasUnsavedChanges.value && editingId.value !== id) {
    confirmModal.value = {
      title: '有未保存的修改',
      message: '切换到另一张卡前需要先保存或丢弃当前修改。',
      onSave: () => { saveEdit(); confirmModal.value = null; startEdit(id) },
      onDiscard: () => { cancelEdit(); confirmModal.value = null; startEdit(id) },
      onCancel: () => { confirmModal.value = null }
    }
    return
  }
  const card = cards.value.find(c => c.id === id)
  if (!card) return
  editingId.value = id
  editingDraft.value = { ...card }
  originalSnapshot.value = { ...card }
}

function saveEdit() {
  if (!editingId.value || !editingDraft.value) return
  const idx = cards.value.findIndex(c => c.id === editingId.value)
  if (idx === -1) return
  cards.value[idx] = {
    ...cards.value[idx],
    cardNo: (editingDraft.value.cardNo || '').trim(),
    session: (editingDraft.value.session || '').trim(),
    groupColor: editingDraft.value.groupColor,
    status: editingDraft.value.status,
    missingCorner: editingDraft.value.missingCorner || '',
    recycleNote: editingDraft.value.recycleNote || '',
    responsible: (editingDraft.value.responsible || '').trim()
  }
  editingId.value = null
  editingDraft.value = null
  originalSnapshot.value = null
  showToast('已保存', 'success')
}

function cancelEdit() {
  editingId.value = null
  editingDraft.value = null
  originalSnapshot.value = null
}

function deleteCard(id) {
  if (editingId.value === id) cancelEdit()
  cards.value = cards.value.filter(c => c.id !== id)
  selectedIds.value.delete(id)
  showToast('已删除', 'info')
}

function duplicateCard(id) {
  const src = cards.value.find(c => c.id === id)
  if (!src) return
  const copy = createEmptyCard({
    session: src.session,
    groupColor: src.groupColor,
    status: 'pending',
    responsible: src.responsible
  })
  copy.order = src.order + 0.5
  cards.value.push(copy)
  showToast('已复制分组信息', 'success')
}

function quickSetStatus(id, status) {
  const idx = cards.value.findIndex(c => c.id === id)
  if (idx === -1) return
  cards.value[idx].status = status
  const opt = STATUS_OPTIONS.find(o => o.value === status)
  showToast(`已标记为「${opt?.label || status}」`, 'success')
}

function toggleSelect(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
    selectedIds.value = new Set(selectedIds.value)
  } else {
    selectedIds.value.add(id)
    selectedIds.value = new Set(selectedIds.value)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    filteredCards.value.forEach(c => selectedIds.value.delete(c.id))
  } else {
    filteredCards.value.forEach(c => selectedIds.value.add(c.id))
  }
  selectedIds.value = new Set(selectedIds.value)
}

function batchSetStatus(status) {
  const list = filteredCards.value.filter(c => selectedIds.value.has(c.id))
  if (list.length === 0) return
  list.forEach(c => { c.status = status })
  const opt = STATUS_OPTIONS.find(o => o.value === status)
  showToast(`已将 ${list.length} 张标记为「${opt?.label || status}」`, 'success')
}

function clearSelection() {
  selectedIds.value = new Set()
}

function clearFilters() {
  filters.value = { session: '', responsible: '', status: '', risk: '' }
}

function onDragStart(e, id) {
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
  if (!dragId.value || dragId.value === targetId) {
    onDragEnd(); return
  }
  const list = [...cards.value].sort((a, b) => a.order - b.order)
  const fromIdx = list.findIndex(c => c.id === dragId.value)
  const toIdx = list.findIndex(c => c.id === targetId)
  if (fromIdx === -1 || toIdx === -1) { onDragEnd(); return }
  const [moved] = list.splice(fromIdx, 1)
  let insertAt = list.findIndex(c => c.id === targetId)
  if (dragOverPos.value === 'bottom') insertAt += 1
  list.splice(insertAt, 0, moved)
  list.forEach((c, i) => { c.order = (i + 1) * 100 })
  cards.value = [...cards.value].map(c => {
    const found = list.find(l => l.id === c.id)
    return found ? { ...c, order: found.order } : c
  })
  showToast('顺序已调整', 'info')
  onDragEnd()
}

function getColorMeta(val) {
  return COLOR_OPTIONS.find(c => c.value === val) || null
}
function getStatusMeta(val) {
  return STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0]
}

function riskLabel(r) {
  return r === 'high' ? '高风险' : r === 'medium' ? '中风险' : '正常'
}

function confirmLeaveWithoutSave(andThen) {
  if (hasUnsavedChanges.value) {
    confirmModal.value = {
      title: '有未保存的修改',
      message: '当前编辑内容尚未保存，是否继续？',
      onSave: () => { saveEdit(); confirmModal.value = null; andThen?.() },
      onDiscard: () => { cancelEdit(); confirmModal.value = null; andThen?.() },
      onCancel: () => { confirmModal.value = null }
    }
  } else {
    andThen?.()
  }
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
        <span v-if="hasUnsavedChanges" class="unsaved-flag">⚠ 有未保存的修改</span>
        <div class="mode-switch" :class="{ 'night-active': nightMode }">
          <button :class="{ active: !nightMode }" @click="nightMode = false">
            ☀ 正常模式
          </button>
          <button :class="{ active: nightMode }" @click="nightMode = true">
            🌙 晚场核对
          </button>
        </div>
        <button class="ghost sm" @click="addCard(false)">＋ 新增</button>
        <button class="primary sm" @click="addCard(true)">＋ 复制上一组新增</button>
      </div>
    </header>

    <div v-if="systemWarnings.length > 0" class="warnings-bar" :class="{ danger: systemWarnings.some(w => w.level === 'danger') }">
      <div class="warn-title">⚠ 系统检查提示（{{ systemWarnings.length }} 项）</div>
      <ul>
        <li v-for="(w, i) in systemWarnings" :key="i">{{ w.text }}</li>
      </ul>
    </div>

    <section class="filter-panel">
      <div class="filter-grid">
        <div>
          <label>所属场次</label>
          <select v-model="filters.session">
            <option value="">全部场次</option>
            <option v-for="s in allSessions" :key="s" :value="s">{{ s }}</option>
            <optgroup label="快捷预设">
              <option v-for="p in SESSION_PRESETS.filter(x => !allSessions.includes(x))" :key="p" :value="p">{{ p }}</option>
            </optgroup>
          </select>
        </div>
        <div>
          <label>责任人</label>
          <select v-model="filters.responsible">
            <option value="">全部责任人</option>
            <option v-for="r in allResponsibles" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <div>
          <label>当前状态</label>
          <select v-model="filters.status">
            <option value="">全部状态</option>
            <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div>
          <label>风险等级</label>
          <select v-model="filters.risk">
            <option value="">全部等级</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">正常</option>
          </select>
        </div>
        <div>
          <label>积压阈值（张）</label>
          <input type="number" v-model.number="backlogThreshold" min="1" />
        </div>
      </div>
      <div class="filter-row">
        <div class="stats">
          <span class="stat-item">共 <b>{{ stats.total }}</b> 张</span>
          <span class="stat-item">待发放 <b>{{ stats.pending }}</b></span>
          <span class="stat-item">已签到 <b>{{ stats.checked }}</b></span>
          <span class="stat-item">待回收 <b>{{ stats.recovering }}</b></span>
          <span class="stat-item">已回收 <b>{{ stats.recovered }}</b></span>
          <span class="stat-item">异常 <b>{{ stats.issue }}</b></span>
          <span class="stat-item">筛选后 <b>{{ stats.showing }}</b> 张</span>
          <span v-if="nightMode" class="stat-item" style="color:#dc2626">🌙 晚场模式</span>
        </div>
        <button class="sm ghost" @click="clearFilters">清空筛选</button>
      </div>
    </section>

    <section v-if="filteredCards.length > 0" class="batch-bar">
      <div class="batch-info" style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" class="card-checkbox"
          :checked="allSelected"
          :indeterminate.prop="someSelected"
          @change="toggleSelectAll" />
        <span>
          <template v-if="someSelected || allSelected">✓ 已选择 {{ selectedCount }} / {{ filteredCards.length }} 张</template>
          <template v-else>（勾选后可批量操作）</template>
        </span>
      </div>
      <div class="batch-actions">
        <button class="sm" @click="batchSetStatus('pending')" :disabled="selectedCount === 0">标记待发放</button>
        <button class="sm success" @click="batchSetStatus('checked')" :disabled="selectedCount === 0">标记已签到</button>
        <button class="sm" style="background:#fcd34d;color:#92400e;border-color:#f59e0b" @click="batchSetStatus('recovering')" :disabled="selectedCount === 0">标记待回收</button>
        <button class="sm danger" @click="batchSetStatus('issue')" :disabled="selectedCount === 0">标记异常待核对</button>
        <button class="sm ghost" @click="clearSelection" v-if="selectedCount > 0">取消选择</button>
      </div>
    </section>

    <section class="cards-list">
      <div v-if="filteredCards.length === 0" class="empty-state">
        <div class="big-icon">📭</div>
        <h3>{{ cards.length === 0 ? '还没有任何签到卡' : '没有符合筛选条件的记录' }}</h3>
        <p>{{ cards.length === 0 ? '点击右上角「新增」开始录入第一张卡' : '尝试修改筛选条件，或在晚场模式下切换' }}</p>
      </div>

      <div
        v-for="card in filteredCards"
        :key="card.id"
        class="card-item"
        :class="{
          editing: editingId === card.id,
          dragging: dragId === card.id,
          'drag-over-top': dragOverId === card.id && dragOverPos === 'top',
          'drag-over-bottom': dragOverId === card.id && dragOverPos === 'bottom',
          'has-risk-high': getRiskLevel(card) === 'high',
          'has-risk-medium': getRiskLevel(card) === 'medium',
          'has-risk-low': getRiskLevel(card) === 'low',
          'night-issue': nightMode && (card.status !== 'recovered' || card.status === 'issue')
        }"
        draggable="true"
        @dragstart="onDragStart($event, card.id)"
        @dragend="onDragEnd"
        @dragover="onDragOver($event, card.id)"
        @drop="onDrop($event, card.id)"
      >
        <div class="card-header">
          <div class="card-head-left">
            <span class="drag-handle" title="拖拽调整顺序">⋮⋮</span>
            <input type="checkbox" class="card-checkbox"
              :checked="selectedIds.has(card.id)"
              @change="toggleSelect(card.id)" />
            <span class="card-no" :class="{ duplicate: duplicateCardNos.has(card.id) }" :title="duplicateCardNos.has(card.id) ? '⚠ 卡号重复' : '卡号'">
              {{ card.cardNo || '(未填)' }}
            </span>
            <span
              v-if="card.groupColor"
              class="color-tag"
              :style="{
                background: getColorMeta(card.groupColor)?.bg,
                color: getColorMeta(card.groupColor)?.fg,
                borderColor: colorConflicts.has(card.id) ? '#ef4444' : 'transparent'
              }"
              :title="colorConflicts.has(card.id) ? '⚠ 同场次颜色冲突' : '分组颜色'"
            >
              <span :style="{'display':'inline-block','width':'8px','height':'8px','border-radius':'50%','background':getColorMeta(card.groupColor)?.dot,'margin-right':'4px'}"></span>
              {{ getColorMeta(card.groupColor)?.label }}
            </span>
            <span class="session-tag" v-if="card.session">🎪 {{ card.session }}</span>
            <span class="status-tag" :class="getStatusMeta(card.status).cls">
              {{ getStatusMeta(card.status).label }}
            </span>
            <span title="风险等级" style="font-size:12px;color:var(--text-muted)">
              <span class="risk-dot" :class="'risk-' + getRiskLevel(card)"></span>
              {{ riskLabel(getRiskLevel(card)) }}
            </span>
          </div>
          <div class="card-head-right">
            <template v-if="editingId === card.id">
              <button class="primary sm" @click="saveEdit" :disabled="!hasUnsavedChanges">💾 保存</button>
              <button class="sm" @click="cancelEdit" v-if="hasUnsavedChanges">取消</button>
              <button class="sm" @click="cancelEdit" v-else>收起</button>
            </template>
            <template v-else>
              <button class="sm" @click="startEdit(card.id)">✏ 编辑</button>
              <button class="sm ghost" @click="duplicateCard(card.id)">📋 复制分组</button>
              <button class="sm danger" @click="deleteCard(card.id)">🗑 删除</button>
            </template>
          </div>
        </div>

        <div class="card-body">
          <template v-if="editingId === card.id && editingDraft">
            <div class="edit-form">
              <div class="form-group">
                <label><span class="req">*</span>卡号</label>
                <input type="text" v-model="editingDraft.cardNo"
                  placeholder="例如 A-001"
                  :class="{ 'color-conflict': duplicateCardNos.has(card.id) && editingDraft.cardNo }" />
              </div>
              <div class="form-group">
                <label><span class="req">*</span>所属场次</label>
                <input type="text" v-model="editingDraft.session" list="session-list" placeholder="早场 / 午场 / 晚场…" />
                <datalist id="session-list">
                  <option v-for="s in [...allSessions, ...SESSION_PRESETS]" :key="s" :value="s">{{ s }}</option>
                </datalist>
              </div>
              <div class="form-group full">
                <label>分组颜色（同场次同色会提示冲突）</label>
                <div class="color-picker">
                  <div
                    v-for="c in COLOR_OPTIONS"
                    :key="c.value"
                    class="color-swatch"
                    :class="{ selected: editingDraft.groupColor === c.value }"
                    :style="{ background: c.dot }"
                    :title="c.label"
                    @click="editingDraft.groupColor = c.value"
                  ></div>
                  <button
                    class="sm ghost"
                    style="margin-left:auto;padding:2px 8px;font-size:11px"
                    @click="editingDraft.groupColor = ''"
                    v-if="editingDraft.groupColor"
                  >清除</button>
                </div>
              </div>
              <div class="form-group">
                <label>当前状态</label>
                <select v-model="editingDraft.status">
                  <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label><span class="req" v-if="card.status === 'issue' || card.status === 'recovering'"></span>责任人</label>
                <input type="text" v-model="editingDraft.responsible"
                  :class="{ 'color-conflict': !editingDraft.responsible.trim() }"
                  placeholder="负责人姓名" />
              </div>
              <div class="form-group full">
                <label>缺角 / 破损说明</label>
                <textarea v-model="editingDraft.missingCorner" placeholder="例如：右上角缺角、背面有污渍、编号模糊…"></textarea>
              </div>
              <div class="form-group full">
                <label>回收备注（交接信息 / 异常补充）</label>
                <textarea v-model="editingDraft.recycleNote" placeholder="例如：由 XX 于 21:30 交还、需联系场次组长补签…"></textarea>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="display-grid">
              <div class="display-field">
                <span class="field-label">卡号</span>
                <span class="field-value" :class="{ empty: !card.cardNo }">
                  {{ card.cardNo || '（未填写）' }}
                </span>
              </div>
              <div class="display-field">
                <span class="field-label">所属场次</span>
                <span class="field-value" :class="{ empty: !card.session }">
                  {{ card.session || '（未填写）' }}
                </span>
              </div>
              <div class="display-field">
                <span class="field-label">分组颜色</span>
                <span class="field-value" :class="{ empty: !card.groupColor }">
                  <template v-if="card.groupColor">
                    <span :style="{'display':'inline-block','width':'10px','height':'10px','border-radius':'50%','background':getColorMeta(card.groupColor)?.dot,'margin-right':'4px'}"></span>
                    {{ getColorMeta(card.groupColor)?.label }}
                  </template>
                  <template v-else>（未指定）</template>
                </span>
              </div>
              <div class="display-field">
                <span class="field-label">责任人</span>
                <span class="field-value" :class="{ empty: !card.responsible, 'responsible-empty': !card.responsible }">
                  {{ card.responsible || '⚠ 未指定责任人' }}
                </span>
              </div>
            </div>
          </template>
        </div>

        <div class="card-footer">
          <div class="issue-notes">
            <span v-if="card.missingCorner && card.missingCorner.trim()" class="issue-note missing-corner" :title="card.missingCorner">
              📌 缺角/破损：{{ card.missingCorner }}
            </span>
            <span v-if="card.recycleNote && card.recycleNote.trim()" class="issue-note recycle-note" :title="card.recycleNote">
              🔄 回收备注：{{ card.recycleNote }}
            </span>
            <span v-if="duplicateCardNos.has(card.id)" class="issue-note">
              ⚠ 卡号与其他卡重复
            </span>
            <span v-if="colorConflicts.has(card.id)" class="issue-note">
              ⚠ 同场次颜色冲突
            </span>
          </div>
          <div class="footer-actions" v-if="editingId !== card.id">
            <button class="sm" @click="quickSetStatus(card.id, 'pending')" title="标记为待发放">待发放</button>
            <button class="sm success" @click="quickSetStatus(card.id, 'checked')" title="已签到">已签到</button>
            <button class="sm" style="background:#fef3c7;color:#92400e;border-color:#f59e0b" @click="quickSetStatus(card.id, 'recovering')" title="待回收">待回收</button>
            <button class="sm danger" @click="quickSetStatus(card.id, 'issue')" title="异常待核对">异常</button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="toast" class="toast" :class="toast.type">{{ toast.msg }}</div>

    <div v-if="confirmModal" class="modal-mask" @click.self="confirmModal?.onCancel()">
      <div class="modal-box">
        <div class="modal-head">{{ confirmModal.title }}</div>
        <div class="modal-body">{{ confirmModal.message }}</div>
        <div class="modal-foot">
          <button class="sm" @click="confirmModal?.onCancel()">取消</button>
          <button class="sm" @click="confirmModal?.onDiscard()">丢弃修改</button>
          <button class="sm primary" @click="confirmModal?.onSave()">先保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
