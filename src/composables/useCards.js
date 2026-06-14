import { ref, computed, watch, onMounted } from 'vue'
import { STORAGE_KEY } from '../constants'
import { uid, safeLoad, safeSave, normalizeCard } from '../utils'

export function createEmptyCard(preset = {}) {
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

export function useCards() {
  const cards = ref([])
  const editingId = ref(null)
  const isCreating = ref(false)
  const editingDraft = ref(null)
  const originalSnapshot = ref(null)
  const selectedIds = ref(new Set())

  const onCardChangeCallbacks = ref([])
  const onCardCreateCallbacks = ref([])
  const onCardDeleteCallbacks = ref([])

  function onCardChange(fn) { onCardChangeCallbacks.value.push(fn) }
  function onCardCreate(fn) { onCardCreateCallbacks.value.push(fn) }
  function onCardDelete(fn) { onCardDeleteCallbacks.value.push(fn) }

  function emitCardChange(oldCard, newCard) {
    onCardChangeCallbacks.value.forEach(fn => fn(oldCard, newCard))
  }
  function emitCardCreate(card) {
    onCardCreateCallbacks.value.forEach(fn => fn(card))
  }
  function emitCardDelete(card) {
    onCardDeleteCallbacks.value.forEach(fn => fn(card))
  }

  onMounted(() => {
    const parsed = safeLoad(STORAGE_KEY, [])
    if (Array.isArray(parsed)) cards.value = parsed
  })

  watch(cards, (val) => {
    safeSave(STORAGE_KEY, val)
  }, { deep: true })

  const editingInProgress = computed(() =>
    isCreating.value || editingId.value !== null
  )

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

  const hasUnsavedChanges = computed(() => {
    if (!editingDraft.value) return false
    const snap = originalSnapshot.value
    if (!snap) return true
    return JSON.stringify(normalizeCard(editingDraft.value)) !==
           JSON.stringify(normalizeCard(snap))
  })

  const stats = computed(() => ({
    total: cards.value.length,
    pending: cards.value.filter(c => c.status === 'pending').length,
    checked: cards.value.filter(c => c.status === 'checked').length,
    recovering: cards.value.filter(c => c.status === 'recovering').length,
    recovered: cards.value.filter(c => c.status === 'recovered').length,
    issue: cards.value.filter(c => c.status === 'issue').length
  }))

  function addCard(copyFromLast = false) {
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
    isCreating.value = true
    editingDraft.value = card
    originalSnapshot.value = createEmptyCard(preset)
    originalSnapshot.value.order = card.order
    originalSnapshot.value.id = card.id
    originalSnapshot.value.createdAt = card.createdAt
  }

  function startEdit(id) {
    const card = cards.value.find(c => c.id === id)
    if (!card) return
    editingId.value = id
    editingDraft.value = { ...card }
    originalSnapshot.value = { ...card }
  }

  function saveEdit() {
    if (!editingDraft.value) return
    const trimmed = {
      ...editingDraft.value,
      cardNo: (editingDraft.value.cardNo || '').trim(),
      session: (editingDraft.value.session || '').trim(),
      missingCorner: editingDraft.value.missingCorner || '',
      recycleNote: editingDraft.value.recycleNote || '',
      responsible: (editingDraft.value.responsible || '').trim()
    }
    if (isCreating.value) {
      const newCard = { ...trimmed }
      cards.value.push(newCard)
      emitCardCreate(newCard)
    } else {
      const idx = cards.value.findIndex(c => c.id === editingId.value)
      if (idx === -1) return
      const oldCard = { ...cards.value[idx] }
      cards.value[idx] = { ...cards.value[idx], ...trimmed }
      emitCardChange(oldCard, cards.value[idx])
    }
    editingId.value = null
    isCreating.value = false
    editingDraft.value = null
    originalSnapshot.value = null
  }

  function cancelEdit() {
    editingId.value = null
    isCreating.value = false
    editingDraft.value = null
    originalSnapshot.value = null
  }

  function deleteCard(id) {
    if (isCreating.value) {
      cancelEdit()
      return
    }
    if (editingId.value === id) cancelEdit()
    const target = cards.value.find(c => c.id === id)
    cards.value = cards.value.filter(c => c.id !== id)
    selectedIds.value.delete(id)
    if (target) emitCardDelete(target)
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
    emitCardCreate(copy)
  }

  function quickSetStatus(id, status) {
    const idx = cards.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const oldCard = { ...cards.value[idx] }
    cards.value[idx].status = status
    emitCardChange(oldCard, { ...cards.value[idx] })
  }

  function toggleSelect(id) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    selectedIds.value = new Set(selectedIds.value)
  }

  function clearSelection() {
    selectedIds.value = new Set()
  }

  function batchSetStatus(status, ids) {
    const list = cards.value.filter(c => ids.has(c.id))
    if (list.length === 0) return
    list.forEach(c => {
      const oldCard = { ...c }
      c.status = status
      emitCardChange(oldCard, { ...c })
    })
    return list.length
  }

  function reorderCard(dragId, targetId, pos) {
    if (!dragId || dragId === targetId) return
    const list = [...cards.value].sort((a, b) => a.order - b.order)
    const fromIdx = list.findIndex(c => c.id === dragId)
    const toIdx = list.findIndex(c => c.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = list.splice(fromIdx, 1)
    let insertAt = list.findIndex(c => c.id === targetId)
    if (pos === 'bottom') insertAt += 1
    list.splice(insertAt, 0, moved)
    list.forEach((c, i) => { c.order = (i + 1) * 100 })
    cards.value = [...cards.value].map(c => {
      const found = list.find(l => l.id === c.id)
      return found ? { ...c, order: found.order } : c
    })
  }

  function findCard(id) {
    return cards.value.find(c => c.id === id) || null
  }

  return {
    cards,
    editingId,
    isCreating,
    editingDraft,
    originalSnapshot,
    selectedIds,
    editingInProgress,
    duplicateCardNos,
    colorConflicts,
    hasUnsavedChanges,
    stats,
    getRiskLevel,
    addCard,
    startEdit,
    saveEdit,
    cancelEdit,
    deleteCard,
    duplicateCard,
    quickSetStatus,
    toggleSelect,
    clearSelection,
    batchSetStatus,
    reorderCard,
    findCard,
    onCardChange,
    onCardCreate,
    onCardDelete
  }
}
