<script setup>
import { getColorMeta } from '../utils'

defineProps({
  card: { type: Object, required: true }
})
</script>

<template>
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
