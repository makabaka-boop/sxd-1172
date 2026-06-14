<script setup>
import { STATUS_OPTIONS, COLOR_OPTIONS, SESSION_PRESETS } from '../constants'

const props = defineProps({
  draft: { type: Object, required: true },
  allSessions: { type: Array, default: () => [] },
  duplicate: { type: Boolean, default: false }
})

const emit = defineEmits(['update'])

function update(key, val) {
  props.draft[key] = val
  emit('update', { key, val })
}
</script>

<template>
  <div class="edit-form">
    <div class="form-group">
      <label><span class="req">*</span>卡号</label>
      <input type="text" :value="draft.cardNo"
        @input="update('cardNo', $event.target.value)"
        placeholder="例如 A-001"
        :class="{ 'color-conflict': duplicate && draft.cardNo }" />
    </div>
    <div class="form-group">
      <label><span class="req">*</span>所属场次</label>
      <input type="text" :value="draft.session" @input="update('session', $event.target.value)"
        list="session-list" placeholder="早场 / 午场 / 晚场…" />
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
          :class="{ selected: draft.groupColor === c.value }"
          :style="{ background: c.dot }"
          :title="c.label"
          @click="update('groupColor', c.value)"
        ></div>
        <button
          class="sm ghost"
          style="margin-left:auto;padding:2px 8px;font-size:11px"
          @click="update('groupColor', '')"
          v-if="draft.groupColor"
        >清除</button>
      </div>
    </div>
    <div class="form-group">
      <label>当前状态</label>
      <select :value="draft.status" @change="update('status', $event.target.value)">
        <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </div>
    <div class="form-group">
      <label>责任人 <span style="font-weight:normal;color:var(--text-soft);margin-left:4px">（建议指定，空缺会提高风险等级）</span></label>
      <input type="text" :value="draft.responsible" @input="update('responsible', $event.target.value)"
        placeholder="负责人姓名（选填，建议填写）" />
    </div>
    <div class="form-group full">
      <label>缺角 / 破损说明</label>
      <textarea :value="draft.missingCorner" @input="update('missingCorner', $event.target.value)"
        placeholder="例如：右上角缺角、背面有污渍、编号模糊…"></textarea>
    </div>
    <div class="form-group full">
      <label>回收备注（交接信息 / 异常补充）</label>
      <textarea :value="draft.recycleNote" @input="update('recycleNote', $event.target.value)"
        placeholder="例如：由 XX 于 21:30 交还、需联系场次组长补签…"></textarea>
    </div>
  </div>
</template>
