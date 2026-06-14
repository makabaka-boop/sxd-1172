import { ref, computed, watch, onMounted } from 'vue'
import { FILTER_KEY, MODE_KEY, SESSION_PRESETS, STATUS_OPTIONS } from '../constants'
import { safeLoad, safeSave } from '../utils'

export function useFilters(cards, getRiskLevel, duplicateCardNos, colorConflicts, tracking) {
  const filters = ref({
    session: '',
    responsible: '',
    status: '',
    risk: '',
    hasIssue: ''
  })
  const nightMode = ref(false)
  const backlogThreshold = ref(5)

  onMounted(() => {
    const f = safeLoad(FILTER_KEY, null)
    if (f) filters.value = { ...filters.value, ...f }
    const m = safeLoad(MODE_KEY, null)
    if (m) nightMode.value = m === 'night'
  })

  watch(filters, (val) => {
    safeSave(FILTER_KEY, val)
  }, { deep: true })

  watch(nightMode, (val) => {
    safeSave(MODE_KEY, val ? 'night' : 'day')
  })

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

  function matchesFilters(c) {
    if (filters.value.session && c.session !== filters.value.session) return false
    if (filters.value.responsible && c.responsible !== filters.value.responsible) return false
    if (filters.value.status && c.status !== filters.value.status) return false
    if (filters.value.risk && getRiskLevel(c) !== filters.value.risk) return false
    if (filters.value.hasIssue) {
      const hasIssueRecord = tracking?.cardsWithIssues?.value?.has(c.id)
      if (filters.value.hasIssue === 'yes' && !hasIssueRecord) return false
      if (filters.value.hasIssue === 'no' && hasIssueRecord) return false
    }
    if (nightMode.value) {
      const hasIssue = c.status === 'issue' ||
        duplicateCardNos.value.has(c.id) ||
        colorConflicts.value.has(c.id) ||
        (c.missingCorner && c.missingCorner.trim()) ||
        (c.recycleNote && c.recycleNote.trim()) ||
        !c.responsible || !c.responsible.trim()
      if (c.status === 'recovered' && !hasIssue) return false
    }
    return true
  }

  function applyFilters(list, pinnedCard = null) {
    let result = [...list]
      .filter(matchesFilters)
      .sort((a, b) => a.order - b.order)
    if (pinnedCard && !result.some(c => c.id === pinnedCard.id)) {
      result = [pinnedCard, ...result]
    }
    return result
  }

  function setFilter(key, value) {
    filters.value[key] = value
  }

  function clearFilters() {
    filters.value = { session: '', responsible: '', status: '', risk: '', hasIssue: '' }
  }

  function setNightMode(val) {
    nightMode.value = val
  }

  return {
    filters,
    nightMode,
    backlogThreshold,
    allSessions,
    allResponsibles,
    systemWarnings,
    matchesFilters,
    applyFilters,
    setFilter,
    clearFilters,
    setNightMode,
    SESSION_PRESETS,
    STATUS_OPTIONS
  }
}
