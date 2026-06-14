<script setup>
import { ref, computed } from 'vue'
import { STATUS_OPTIONS } from '../constants'
import { formatTime } from '../utils'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  tracking: { type: Object, required: true },
  currentFilter: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['applyFilter'])

const activeTab = ref('responsible')

const TABS = [
  { key: 'responsible', label: '👤 按责任人', icon: '👤' },
  { key: 'session', label: '🎪 按场次', icon: '🎪' },
  { key: 'status', label: '📊 按状态', icon: '📊' },
  { key: 'issue', label: '⚠ 异常记录', icon: '⚠' }
]

const byResponsible = computed(() => {
  const map = new Map()
  props.cards.forEach(c => {
    const key = c.responsible || '(未指定)'
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        total: 0,
        byStatus: {},
        cards: [],
        trackCount: 0
      })
    }
    const item = map.get(key)
    item.total++
    item.byStatus[c.status] = (item.byStatus[c.status] || 0) + 1
    item.cards.push(c.id)
    item.trackCount += props.tracking.getRecordsByCard(c.id, 0).length
  })
  return [...map.values()].sort((a, b) => b.total - a.total)
})

const bySession = computed(() => {
  const map = new Map()
  props.cards.forEach(c => {
    const key = c.session || '(未指定)'
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        total: 0,
        byStatus: {},
        cards: [],
        trackCount: 0
      })
    }
    const item = map.get(key)
    item.total++
    item.byStatus[c.status] = (item.byStatus[c.status] || 0) + 1
    item.cards.push(c.id)
    item.trackCount += props.tracking.getRecordsByCard(c.id, 0).length
  })
  return [...map.values()].sort((a, b) => b.total - a.total)
})

const byStatus = computed(() => {
  return STATUS_OPTIONS.map(s => {
    const list = props.cards.filter(c => c.status === s.value)
    return {
      name: s.label,
      statusValue: s.value,
      total: list.length,
      cards: list.map(c => c.id),
      trackCount: list.reduce((sum, c) => sum + props.tracking.getRecordsByCard(c.id, 0).length, 0)
    }
  })
})

const issueCards = computed(() => {
  const ids = props.tracking.cardsWithIssues.value
  return props.cards
    .filter(c => ids.has(c.id))
    .map(c => ({
      card: c,
      records: props.tracking.getRecordsByCard(c.id, 3)
    }))
})

function filterByResponsible(name) {
  const value = name === '(未指定)' ? '' : name
  emit('applyFilter', { key: 'responsible', value })
}

function filterBySession(name) {
  const value = name === '(未指定)' ? '' : name
  emit('applyFilter', { key: 'session', value })
}

function filterByStatus(statusValue) {
  emit('applyFilter', { key: 'status', value: statusValue })
}

function filterByIssue() {
  emit('applyFilter', { key: 'hasIssue', value: 'yes' })
}

function getStatusCountLabel(item) {
  return STATUS_OPTIONS
    .filter(s => item.byStatus[s.value])
    .map(s => `${s.label}:${item.byStatus[s.value]}`)
    .join(' / ') || '暂无数据'
}

const overviewStats = computed(() => ({
  totalCards: props.cards.length,
  totalRecords: props.tracking.totalRecords.value,
  issueCardCount: issueCards.value.length,
  withoutResponsible: props.cards.filter(c => !c.responsible).length
}))
</script>

<template>
  <section class="overview-panel">
    <div class="overview-header">
      <h2>📈 交接概览</h2>
      <div class="overview-stats">
        <span class="stat-chip">共 {{ overviewStats.totalCards }} 张卡</span>
        <span class="stat-chip">共 {{ overviewStats.totalRecords }} 条操作记录</span>
        <span class="stat-chip warn" v-if="overviewStats.issueCardCount > 0">
          ⚠ {{ overviewStats.issueCardCount }} 张存在异常记录
        </span>
        <span class="stat-chip warn" v-if="overviewStats.withoutResponsible > 0">
          ⚠ {{ overviewStats.withoutResponsible }} 张未指定责任人
        </span>
      </div>
    </div>

    <div class="overview-tabs">
      <button
        v-for="t in TABS"
        :key="t.key"
        class="overview-tab"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="overview-body">
      <div v-if="activeTab === 'responsible'" class="overview-grid">
        <div v-for="item in byResponsible" :key="item.name" class="overview-card"
          @click="filterByResponsible(item.name)">
          <div class="ov-card-head">
            <span class="ov-card-title">
              <span class="ov-avatar" :class="{ empty: item.name === '(未指定)' }">
                {{ item.name === '(未指定)' ? '?' : item.name.slice(0, 1) }}
              </span>
              {{ item.name }}
            </span>
            <span class="ov-card-count">{{ item.total }} 张</span>
          </div>
          <div class="ov-card-detail">
            <span class="ov-detail-text">{{ getStatusCountLabel(item) }}</span>
            <span class="ov-track-count">📝 {{ item.trackCount }} 条记录</span>
          </div>
        </div>
        <div v-if="byResponsible.length === 0" class="overview-empty">暂无数据</div>
      </div>

      <div v-if="activeTab === 'session'" class="overview-grid">
        <div v-for="item in bySession" :key="item.name" class="overview-card"
          @click="filterBySession(item.name)">
          <div class="ov-card-head">
            <span class="ov-card-title">
              <span class="ov-icon">🎪</span>
              {{ item.name }}
            </span>
            <span class="ov-card-count">{{ item.total }} 张</span>
          </div>
          <div class="ov-card-detail">
            <span class="ov-detail-text">{{ getStatusCountLabel(item) }}</span>
            <span class="ov-track-count">📝 {{ item.trackCount }} 条记录</span>
          </div>
        </div>
        <div v-if="bySession.length === 0" class="overview-empty">暂无数据</div>
      </div>

      <div v-if="activeTab === 'status'" class="overview-grid">
        <div v-for="item in byStatus" :key="item.statusValue" class="overview-card status-card"
          @click="filterByStatus(item.statusValue)">
          <div class="ov-card-head">
            <span class="status-tag" :class="'status-' + item.statusValue">{{ item.name }}</span>
            <span class="ov-card-count">{{ item.total }} 张</span>
          </div>
          <div class="ov-card-detail">
            <span class="ov-detail-text">占比：{{ overviewStats.totalCards ? Math.round(item.total / overviewStats.totalCards * 100) : 0 }}%</span>
            <span class="ov-track-count">📝 {{ item.trackCount }} 条记录</span>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'issue'" class="issue-list">
        <div class="issue-actions" v-if="issueCards.length > 0">
          <button class="sm primary" @click="filterByIssue">🎯 应用筛选：仅显示有异常记录的卡</button>
        </div>
        <div v-for="item in issueCards" :key="item.card.id" class="issue-item">
          <div class="issue-head">
            <span class="issue-card-no">{{ item.card.cardNo || '(未填卡号)' }}</span>
            <span class="issue-card-session" v-if="item.card.session">🎪 {{ item.card.session }}</span>
            <span class="issue-card-resp" v-if="item.card.responsible">👤 {{ item.card.responsible }}</span>
          </div>
          <div class="issue-records">
            <div v-for="r in item.records" :key="r.id" class="issue-record">
              <span class="issue-record-time">{{ formatTime(r.createdAt) }}</span>
              <span class="issue-record-text">{{ tracking.formatRecordText(r) }}</span>
            </div>
          </div>
        </div>
        <div v-if="issueCards.length === 0" class="overview-empty">
          ✅ 目前没有存在异常记录的签到卡
        </div>
      </div>
    </div>
  </section>
</template>
