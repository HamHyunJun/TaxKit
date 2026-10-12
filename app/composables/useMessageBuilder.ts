import type { ColumnMapping } from '~/types/excel'
import type { MessageChannel, MessageSettings, MissingEvidenceRow, PartnerGroup } from '~/types/message'
import type { MessageFieldKey } from '~/utils/messageSpecs'
import type { PendingMapping, SheetSourceState } from '~/composables/useSheetSource'

type MessageSourceMode = 'handoff' | 'upload'

type UseMessageBuilderReturn = {
  mode: Ref<MessageSourceMode>
  handoffCount: ComputedRef<number>
  source: Readonly<Ref<SheetSourceState<MissingEvidenceRow>>>
  pending: Readonly<Ref<PendingMapping | null>>
  canReopen: ComputedRef<boolean>
  settings: Ref<MessageSettings>
  search: Ref<string>
  rowCount: ComputedRef<number>
  groups: ComputedRef<PartnerGroup[]>
  visibleGroups: ComputedRef<PartnerGroup[]>
  activeGroup: ComputedRef<PartnerGroup | null>
  copiedKeys: Readonly<Ref<readonly string[]>>
  select: (key: string) => void
  messageOf: (group: PartnerGroup) => string
  allMessages: () => string
  markCopied: (keys: readonly string[]) => void
  loadFile: (file: File) => Promise<void>
  confirmMapping: (mapping: ColumnMapping) => void
  cancelMapping: () => void
  reopenMapping: () => void
}

const STORAGE_KEY = 'taxkit:message-settings'

type StoredSettings = Pick<MessageSettings, 'officeName' | 'manager' | 'templates'>

// 저장된 설정(템플릿·사무소명·담당자)만 읽는다. 값이 깨졌으면 무시한다
const loadStored = (): Partial<StoredSettings> => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof stored !== 'object' || stored === null) return {}
    const officeName: unknown = Reflect.get(stored, 'officeName')
    const manager: unknown = Reflect.get(stored, 'manager')
    const templates: unknown = Reflect.get(stored, 'templates')
    const result: Partial<StoredSettings> = {}
    if (typeof officeName === 'string') result.officeName = officeName
    if (typeof manager === 'string') result.manager = manager
    if (typeof templates === 'object' && templates !== null) {
      const kakao: unknown = Reflect.get(templates, 'kakao')
      const sms: unknown = Reflect.get(templates, 'sms')
      result.templates = {
        kakao: typeof kakao === 'string' ? kakao : DEFAULT_TEMPLATES.kakao,
        sms: typeof sms === 'string' ? sms : DEFAULT_TEMPLATES.sms,
      }
    }
    return result
  }
  catch {
    return {}
  }
}

const saveStored = (settings: MessageSettings): void => {
  const stored: StoredSettings = { officeName: settings.officeName, manager: settings.manager, templates: settings.templates }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  }
  catch {
    // 저장소 차단(시크릿 모드 등)이어도 기능은 계속 동작한다
  }
}

// Tab 3 상태: Tab 1에서 넘어온 누락 건 또는 직접 올린 엑셀 → 거래처별 그룹 → 템플릿 치환. 모두 브라우저 메모리 안에서만 처리한다
export const useMessageBuilder = (): UseMessageBuilderReturn => {
  const { rows: handoffRows } = useHandoff()
  const upload = useSheetSource<MessageFieldKey, MissingEvidenceRow>({
    specs: MESSAGE_FIELDS,
    adjustMapping: withPartnerFallback,
    isComplete: isMessageMappingComplete,
    incompleteMessage: '거래처명, 거래일자, 금액 열을 지정해 주세요',
    emptyMessage: '메시지를 만들 수 있는 행이 없어요. 컬럼 매핑을 확인해 주세요',
    toRows: toMissingRows,
  })

  const stored = loadStored()
  const settings = ref<MessageSettings>({
    channel: 'kakao',
    officeName: stored.officeName ?? '',
    manager: stored.manager ?? '',
    dueDate: defaultDueDate(),
    templates: stored.templates ?? { ...DEFAULT_TEMPLATES },
  })
  watch(() => [settings.value.officeName, settings.value.manager, settings.value.templates], () => saveStored(settings.value), { deep: true })

  // Tab 1에서 넘어온 데이터가 있으면 자동으로 그 소스를 쓰고, 새로 넘어오면 다시 그쪽으로 전환한다
  const mode = ref<MessageSourceMode>(handoffRows.value.length > 0 ? 'handoff' : 'upload')
  const handoffCount = computed<number>(() => handoffRows.value.length)
  watch(handoffCount, (count) => {
    if (count > 0) mode.value = 'handoff'
  })

  const uploadedRows = computed<MissingEvidenceRow[]>(() => upload.state.value.rows)
  const search = ref<string>('')
  const selectedKey = ref<string | null>(null)
  const copiedKeys = ref<string[]>([])

  const rows = computed<readonly MissingEvidenceRow[]>(() => (mode.value === 'handoff' ? handoffRows.value : uploadedRows.value))
  const rowCount = computed<number>(() => rows.value.length)
  const groups = computed<PartnerGroup[]>(() => groupByPartner(rows.value))
  const visibleGroups = computed<PartnerGroup[]>(() => groups.value.filter(group => matchesPartner(group, search.value)))
  // 선택한 거래처가 목록에서 사라졌으면 보이는 첫 거래처를 대신 보여준다
  const activeGroup = computed<PartnerGroup | null>(() =>
    visibleGroups.value.find(group => group.key === selectedKey.value) ?? visibleGroups.value[0] ?? null,
  )

  // 소스가 바뀌면 복사 표시와 선택을 처음 상태로 되돌린다
  watch([mode, handoffRows, upload.state], () => {
    copiedKeys.value = []
    selectedKey.value = null
  })

  // 파일을 올리면 그 파일을 소스로 쓴다
  watch(upload.state, (state) => {
    if (state.fileName) mode.value = 'upload'
  })

  const messageOf = (group: PartnerGroup): string => {
    const channel: MessageChannel = settings.value.channel
    return renderMessage(settings.value.templates[channel], group, settings.value)
  }
  const allMessages = (): string => joinMessages(groups.value.map(messageOf))
  const select = (key: string): void => {
    selectedKey.value = key
  }
  const markCopied = (keys: readonly string[]): void => {
    copiedKeys.value = [...new Set([...copiedKeys.value, ...keys])]
  }

  return {
    mode, handoffCount, source: upload.state, pending: upload.pending, canReopen: upload.canReopen, settings, search, rowCount, groups, visibleGroups,
    activeGroup, copiedKeys, select, messageOf, allMessages, markCopied,
    loadFile: upload.loadFile, confirmMapping: upload.confirmMapping, cancelMapping: upload.cancelMapping, reopenMapping: upload.reopenMapping,
  }
}
