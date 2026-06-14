import { COLOR_OPTIONS, STATUS_OPTIONS } from '../constants'

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function getColorMeta(val) {
  return COLOR_OPTIONS.find(c => c.value === val) || null
}

export function getStatusMeta(val) {
  return STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0]
}

export function riskLabel(r) {
  return r === 'high' ? '高风险' : r === 'medium' ? '中风险' : '正常'
}

export function formatTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function normalizeCard(o) {
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

export function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch (e) {
    console.warn(`load error for ${key}`, e)
    return fallback
  }
}

export function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`save error for ${key}`, e)
  }
}
