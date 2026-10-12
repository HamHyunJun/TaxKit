import type { TabId, TabItem } from '~/types/tab'

export const TABS: readonly TabItem[] = [
  { id: 'reconcile', label: '계좌·세금계산서 대사' },
  { id: 'scanner', label: '법인카드 스캐너' },
  { id: 'message', label: '독촉 메시지' },
]

export const DEFAULT_TAB: TabId = 'reconcile'

// 쿼리 값이 유효한 탭 id인지 좁힌다
export const isTabId = (value: unknown): value is TabId =>
  TABS.some(tab => tab.id === value)
