import type { ColumnMapping, ParseIssue, RawSheet } from '~/types/excel'
import type { MessageChannel, MessageSettings, MissingEvidenceRow, PartnerGroup } from '~/types/message'
import type { MessageFieldKey } from '~/utils/messageSpecs'

export type MessageSourceMode = 'handoff' | 'upload'

export type MessageSource = {
  fileName: string | null
  needsCheck: number // 값을 해석하지 못해 확인이 필요한 행 수
  error: string | null
}

// 필수 열을 자동으로 찾지 못해 사용자의 컬럼 매핑을 기다리는 파일
export type MessagePending = {
  fileName: string
  sheet: RawSheet
  headerRowIndex: number
  headers: string[]
  mapping: ColumnMapping
  signature: string
}

type UseMessageBuilderReturn = {
  mode: Ref<MessageSourceMode>
  handoffCount: ComputedRef<number>
  source: Readonly<Ref<MessageSource>>
  pending: Readonly<Ref<MessagePending | null>>
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

const countNeedsCheck = (issues: readonly ParseIssue[], skipped: readonly number[]): number =>
  new Set([...issues.map(issue => issue.rowIndex), ...skipped]).size

// Tab 3 상태: Tab 1에서 넘어온 누락 건 또는 직접 올린 엑셀 → 거래처별 그룹 → 템플릿 치환. 모두 브라우저 메모리 안에서만 처리한다
export const useMessageBuilder = (): UseMessageBuilderReturn => {
  const { rows: handoffRows } = useHandoff()
  const { readWorkbook, pickDefaultSheet, detectColumns, parseSheet } = useExcelReader()
  const { getSignature, loadMapping, saveMapping } = useColumnMapping()

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

  const source = ref<MessageSource>({ fileName: null, needsCheck: 0, error: null })
  const pending = ref<MessagePending | null>(null)
  const uploadedRows = shallowRef<MissingEvidenceRow[]>([])
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
  watch([mode, handoffRows], () => {
    copiedKeys.value = []
    selectedKey.value = null
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

  const fail = (message: string): void => {
    source.value = { fileName: null, needsCheck: 0, error: message }
    uploadedRows.value = []
  }

  const finalize = (target: MessagePending): void => {
    const parsed = parseSheet(target.sheet, target.fileName, target.headerRowIndex, target.mapping as ColumnMapping<MessageFieldKey>, MESSAGE_FIELDS)
    const converted = toMissingRows(parsed.rows)
    uploadedRows.value = converted.rows
    copiedKeys.value = []
    selectedKey.value = null
    source.value = {
      fileName: target.fileName,
      needsCheck: countNeedsCheck(parsed.issues, converted.skipped),
      error: converted.rows.length === 0 ? '메시지를 만들 수 있는 행이 없어요. 컬럼 매핑을 확인해 주세요' : null,
    }
    mode.value = 'upload'
  }

  const loadFile = async (file: File): Promise<void> => {
    try {
      const workbook = await readWorkbook(file)
      const sheet = pickDefaultSheet(workbook)
      if (!sheet) {
        fail('데이터가 있는 시트를 찾지 못했어요')
        return
      }
      const detection = detectColumns(sheet.rows, MESSAGE_FIELDS)
      const signature = getSignature(detection.headers)
      // 같은 양식에서 사용자가 지정해 둔 매핑이 있으면 그것을 우선한다
      const mapping = withPartnerFallback(loadMapping(signature, MESSAGE_FIELDS.map(field => field.key)) ?? detection.mapping)
      const target: MessagePending = { fileName: file.name, sheet, headerRowIndex: detection.headerRowIndex, headers: detection.headers, mapping, signature }
      if (isMessageMappingComplete(mapping)) finalize(target)
      else pending.value = target
    }
    catch (error) {
      fail(error instanceof Error ? error.message : '파일을 처리하지 못했어요')
    }
  }

  const confirmMapping = (mapping: ColumnMapping): void => {
    const target = pending.value
    if (!target) return
    pending.value = null
    if (!isMessageMappingComplete(mapping)) {
      fail('거래처명, 거래일자, 금액 열을 지정해 주세요')
      return
    }
    saveMapping(target.signature, mapping)
    finalize({ ...target, mapping })
  }

  const cancelMapping = (): void => {
    if (!pending.value) return
    pending.value = null
    fail('컬럼 매핑이 취소되어 파일을 불러오지 않았어요')
  }

  return {
    mode, handoffCount, source, pending, settings, search, rowCount, groups, visibleGroups, activeGroup, copiedKeys,
    select, messageOf, allMessages, markCopied, loadFile, confirmMapping, cancelMapping,
  }
}
