export const STORAGE_KEY = 'signin_cards_v1'
export const FILTER_KEY = 'signin_filters_v1'
export const MODE_KEY = 'signin_mode_v1'
export const TRACKING_KEY = 'signin_tracking_v1'
export const HANDSHAKE_KEY = 'signin_handshake_v1'

export const STATUS_OPTIONS = [
  { value: 'pending', label: '待发放', cls: 'status-pending' },
  { value: 'checked', label: '已签到', cls: 'status-checked' },
  { value: 'recovering', label: '待回收', cls: 'status-recovering' },
  { value: 'recovered', label: '已回收', cls: 'status-recovered' },
  { value: 'issue', label: '异常待核对', cls: 'status-issue' }
]

export const COLOR_OPTIONS = [
  { value: 'red', label: '红色', bg: '#fee2e2', fg: '#991b1b', dot: '#ef4444' },
  { value: 'orange', label: '橙色', bg: '#ffedd5', fg: '#9a3412', dot: '#f97316' },
  { value: 'yellow', label: '黄色', bg: '#fef9c3', fg: '#854d0e', dot: '#eab308' },
  { value: 'green', label: '绿色', bg: '#dcfce7', fg: '#166534', dot: '#22c55e' },
  { value: 'cyan', label: '青色', bg: '#cffafe', fg: '#155e75', dot: '#06b6d4' },
  { value: 'blue', label: '蓝色', bg: '#dbeafe', fg: '#1e3a8a', dot: '#3b82f6' },
  { value: 'purple', label: '紫色', bg: '#ede9fe', fg: '#5b21b6', dot: '#8b5cf6' },
  { value: 'pink', label: '粉色', bg: '#fce7f3', fg: '#9d174d', dot: '#ec4899' }
]

export const SESSION_PRESETS = ['早场', '午场', '晚场', '夜场', 'VIP专场']

export const TRACKING_TYPES = {
  STATUS_CHANGE: 'status_change',
  RESPONSIBLE_CHANGE: 'responsible_change',
  MISSING_CORNER_CHANGE: 'missing_corner_change',
  RECYCLE_NOTE_CHANGE: 'recycle_note_change',
  CARD_CREATE: 'card_create',
  CARD_DELETE: 'card_delete'
}

export const TRACKING_TYPE_LABELS = {
  [TRACKING_TYPES.STATUS_CHANGE]: '状态变更',
  [TRACKING_TYPES.RESPONSIBLE_CHANGE]: '责任人调整',
  [TRACKING_TYPES.MISSING_CORNER_CHANGE]: '缺角/破损更新',
  [TRACKING_TYPES.RECYCLE_NOTE_CHANGE]: '回收备注更新',
  [TRACKING_TYPES.CARD_CREATE]: '卡片新增',
  [TRACKING_TYPES.CARD_DELETE]: '卡片删除'
}
