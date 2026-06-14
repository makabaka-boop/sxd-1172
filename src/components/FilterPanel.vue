<script setup>
import { STATUS_OPTIONS, SESSION_PRESETS } from '../constants'

const props = defineProps({
  filters: { type: Object, required: true },
  allSessions: { type: Array, default: () => [] },
  allResponsibles: { type: Array, default: () => [] },
  backlogThreshold: { type: Number, default: 5 },
  stats: { type: Object, required: true },
  showing: { type: Number, default: 0 },
  nightMode: { type: Boolean, default: false }
})

const emit = defineEmits(['setFilter', 'setBacklog', 'clear'])
</script>

<template>
  <section class="filter-panel">
    <div class="filter-grid">
      <div>
        <label>所属场次</label>
        <select :value="filters.session" @change="emit('setFilter', 'session', $event.target.value)">
          <option value="">全部场次</option>
          <option v-for="s in allSessions" :key="s" :value="s">{{ s }}</option>
          <optgroup label="快捷预设">
            <option v-for="p in SESSION_PRESETS.filter(x => !allSessions.includes(x))" :key="p" :value="p">{{ p }}</option>
          </optgroup>
        </select>
      </div>
      <div>
        <label>责任人</label>
        <select :value="filters.responsible" @change="emit('setFilter', 'responsible', $event.target.value)">
          <option value="">全部责任人</option>
          <option v-for="r in allResponsibles" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
      <div>
        <label>当前状态</label>
        <select :value="filters.status" @change="emit('setFilter', 'status', $event.target.value)">
          <option value="">全部状态</option>
          <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div>
        <label>风险等级</label>
        <select :value="filters.risk" @change="emit('setFilter', 'risk', $event.target.value)">
          <option value="">全部等级</option>
          <option value="high">高风险</option>
          <option value="medium">中风险</option>
          <option value="low">正常</option>
        </select>
      </div>
      <div>
        <label>是否存在异常记录</label>
        <select :value="filters.hasIssue || ''" @change="emit('setFilter', 'hasIssue', $event.target.value)">
          <option value="">全部</option>
          <option value="yes">存在异常记录</option>
          <option value="no">无异常记录</option>
        </select>
      </div>
      <div>
        <label>积压阈值（张）</label>
        <input type="number" :value="backlogThreshold" @input="emit('setBacklog', Number($event.target.value))" min="1" />
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
        <span class="stat-item">筛选后 <b>{{ showing }}</b> 张</span>
        <span v-if="nightMode" class="stat-item" style="color:#dc2626">🌙 晚场模式</span>
      </div>
      <button class="sm ghost" @click="emit('clear')">清空筛选</button>
    </div>
  </section>
</template>
