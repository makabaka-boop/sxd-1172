import { ref, computed, watch, onMounted } from 'vue'
import { TRACKING_KEY, TRACKING_TYPES, TRACKING_TYPE_LABELS, STATUS_OPTIONS } from '../constants'
import { uid, safeLoad, safeSave } from '../utils'

function getStatusLabel(val) {
  const opt = STATUS_OPTIONS.find(s => s.value === val)
  return opt ? opt.label : val
}

export function useTracking() {
  const records = ref([])
  const RECENT_LIMIT = 5

  onMounted(() => {
    const parsed = safeLoad(TRACKING_KEY, [])
    if (Array.isArray(parsed)) records.value = parsed
  })

  watch(records, (val) => {
    safeSave(TRACKING_KEY, val)
  }, { deep: true })

  function addRecord(cardId, type, payload) {
    const record = {
      id: uid(),
      cardId,
      type,
      payload: payload || {},
      createdAt: Date.now()
    }
    records.value.unshift(record)
    if (records.value.length > 500) {
      records.value = records.value.slice(0, 500)
    }
    return record
  }

  function formatRecordText(record) {
    const { type, payload } = record
    switch (type) {
      case TRACKING_TYPES.STATUS_CHANGE:
        return `状态变更：${getStatusLabel(payload.from) || '未设置'} → ${getStatusLabel(payload.to)}`
      case TRACKING_TYPES.RESPONSIBLE_CHANGE:
        return `责任人调整：${payload.from || '（无）'} → ${payload.to || '（无）'}`
      case TRACKING_TYPES.MISSING_CORNER_CHANGE:
        if (payload.to) {
          if (payload.from) {
            return `缺角/破损说明更新`
          }
          return `新增缺角/破损说明`
        }
        return `清除缺角/破损说明`
      case TRACKING_TYPES.RECYCLE_NOTE_CHANGE:
        if (payload.to) {
          if (payload.from) {
            return `回收备注更新`
          }
          return `新增回收备注`
        }
        return `清除回收备注`
      case TRACKING_TYPES.CARD_CREATE:
        return `新增签到卡`
      case TRACKING_TYPES.CARD_DELETE:
        return `删除签到卡`
      default:
        return '操作记录'
    }
  }

  function getRecordIcon(type) {
    switch (type) {
      case TRACKING_TYPES.STATUS_CHANGE:
        return '🔄'
      case TRACKING_TYPES.RESPONSIBLE_CHANGE:
        return '👤'
      case TRACKING_TYPES.MISSING_CORNER_CHANGE:
        return '📌'
      case TRACKING_TYPES.RECYCLE_NOTE_CHANGE:
        return '📝'
      case TRACKING_TYPES.CARD_CREATE:
        return '➕'
      case TRACKING_TYPES.CARD_DELETE:
        return '🗑'
      default:
        return '•'
    }
  }

  function getRecordsByCard(cardId, limit = RECENT_LIMIT) {
    const list = records.value.filter(r => r.cardId === cardId)
    return limit > 0 ? list.slice(0, limit) : list
  }

  function processCardChange(oldCard, newCard) {
    const patches = []
    if (oldCard.status !== newCard.status) {
      patches.push({
        type: TRACKING_TYPES.STATUS_CHANGE,
        payload: { from: oldCard.status, to: newCard.status }
      })
    }
    if ((oldCard.responsible || '') !== (newCard.responsible || '')) {
      patches.push({
        type: TRACKING_TYPES.RESPONSIBLE_CHANGE,
        payload: { from: oldCard.responsible, to: newCard.responsible }
      })
    }
    if ((oldCard.missingCorner || '') !== (newCard.missingCorner || '')) {
      patches.push({
        type: TRACKING_TYPES.MISSING_CORNER_CHANGE,
        payload: { from: oldCard.missingCorner, to: newCard.missingCorner }
      })
    }
    if ((oldCard.recycleNote || '') !== (newCard.recycleNote || '')) {
      patches.push({
        type: TRACKING_TYPES.RECYCLE_NOTE_CHANGE,
        payload: { from: oldCard.recycleNote, to: newCard.recycleNote }
      })
    }
    patches.forEach(p => addRecord(newCard.id, p.type, p.payload))
    return patches.length
  }

  function processCardCreate(card) {
    addRecord(card.id, TRACKING_TYPES.CARD_CREATE, {})
  }

  function processCardDelete(card) {
    addRecord(card.id, TRACKING_TYPES.CARD_DELETE, { cardSnapshot: { ...card } })
  }

  const cardsWithIssues = computed(() => {
    const issueTypes = new Set([
      TRACKING_TYPES.MISSING_CORNER_CHANGE,
      TRACKING_TYPES.CARD_DELETE,
      TRACKING_TYPES.STATUS_CHANGE
    ])
    const ids = new Set()
    records.value.forEach(r => {
      if (r.type === TRACKING_TYPES.MISSING_CORNER_CHANGE && r.payload?.to) {
        ids.add(r.cardId)
      }
      if (r.type === TRACKING_TYPES.STATUS_CHANGE && r.payload?.to === 'issue') {
        ids.add(r.cardId)
      }
      if (r.type === TRACKING_TYPES.RECYCLE_NOTE_CHANGE && r.payload?.to) {
        ids.add(r.cardId)
      }
    })
    return ids
  })

  const totalRecords = computed(() => records.value.length)

  const overviewByResponsible = computed(() => {
    const map = new Map()
    records.value.forEach(r => {
      const resp = r.payload?.to && r.type === TRACKING_TYPES.RESPONSIBLE_CHANGE
        ? r.payload.to
        : null
      if (!resp) return
      if (!map.has(resp)) map.set(resp, { total: 0, recent: [] })
      map.get(resp).total++
      if (map.get(resp).recent.length < 3) map.get(resp).recent.push(r)
    })
    return map
  })

  const overviewByStatus = computed(() => {
    const map = new Map()
    records.value.forEach(r => {
      if (r.type !== TRACKING_TYPES.STATUS_CHANGE) return
      const status = r.payload?.to || 'unknown'
      if (!map.has(status)) map.set(status, { total: 0, recent: [] })
      map.get(status).total++
      if (map.get(status).recent.length < 3) map.get(status).recent.push(r)
    })
    return map
  })

  return {
    records,
    totalRecords,
    cardsWithIssues,
    overviewByResponsible,
    overviewByStatus,
    TRACKING_TYPES,
    TRACKING_TYPE_LABELS,
    RECENT_LIMIT,
    addRecord,
    formatRecordText,
    getRecordIcon,
    getRecordsByCard,
    processCardChange,
    processCardCreate,
    processCardDelete
  }
}
