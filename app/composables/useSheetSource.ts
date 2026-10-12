import type { ColumnMapping, FieldSpec, ParseIssue, ParsedRecord, RawSheet } from '~/types/excel'

export type SheetSourceState<Row> = {
  fileName: string | null
  rows: Row[]
  needsCheck: number // 값을 해석하지 못해 확인이 필요한 행 수
  error: string | null
}

// 필수 열을 자동으로 찾지 못했거나, 사용자가 매핑을 다시 지정하려는 파일
export type PendingMapping = {
  fileName: string
  sheet: RawSheet
  headerRowIndex: number
  headers: string[]
  mapping: ColumnMapping
  signature: string
  specs: readonly FieldSpec[] // 모달이 보여줄 필드
  reopened: boolean // 이미 불러온 파일의 매핑을 다시 지정하는 중이면, 취소해도 불러온 데이터를 지우지 않는다
}

type SheetSourceConfig<K extends string, Row> = {
  specs: readonly FieldSpec<K>[]
  adjustMapping?: (mapping: ColumnMapping) => ColumnMapping // 저장된·자동 매핑을 보정한다 (예: 거래처 열이 없으면 적요 열을 쓴다)
  isComplete: (mapping: ColumnMapping) => boolean
  incompleteMessage: string
  emptyMessage: string
  toRows: (records: readonly ParsedRecord<K>[]) => { rows: Row[], skipped: number[] }
}

type UseSheetSourceReturn<Row> = {
  state: Readonly<Ref<SheetSourceState<Row>>>
  pending: Readonly<Ref<PendingMapping | null>>
  canReopen: ComputedRef<boolean>
  loadFile: (file: File) => Promise<void>
  confirmMapping: (mapping: ColumnMapping) => void
  cancelMapping: () => void
  reopenMapping: () => void
}

const emptyState = <Row>(error: string | null = null): SheetSourceState<Row> => ({ fileName: null, rows: [], needsCheck: 0, error })

// 파싱 이슈가 있는 행과 변환하지 못한 행을 합쳐 "확인 필요" 건수를 센다
const countNeedsCheck = (issues: readonly ParseIssue[], skipped: readonly number[]): number =>
  new Set([...issues.map(issue => issue.rowIndex), ...skipped]).size

// 엑셀 하나의 읽기 → 헤더·열 매핑(필요하면 모달) → 정규화 → 행 변환. 세 탭이 같은 흐름을 쓴다
export const useSheetSource = <K extends string, Row>(config: SheetSourceConfig<K, Row>): UseSheetSourceReturn<Row> => {
  const { readWorkbook, pickDefaultSheet, detectColumns, parseSheet } = useExcelReader()
  const { getSignature, loadMapping, saveMapping } = useColumnMapping()
  const adjust = config.adjustMapping ?? ((mapping: ColumnMapping): ColumnMapping => mapping)

  // 행이 수만 건이라 깊은 반응형을 피하고, 항상 통째로 교체한다
  const state = shallowRef<SheetSourceState<Row>>(emptyState())
  const pending = ref<PendingMapping | null>(null)
  const lastLoaded = shallowRef<PendingMapping | null>(null) // 마지막으로 불러온 파일 (매핑 다시 지정용)
  const canReopen = computed<boolean>(() => lastLoaded.value !== null)

  const fail = (message: string): void => {
    state.value = emptyState(message)
    lastLoaded.value = null
  }

  const finalize = (target: PendingMapping): void => {
    const parsed = parseSheet(target.sheet, target.fileName, target.headerRowIndex, target.mapping as ColumnMapping<K>, config.specs)
    const { rows, skipped } = config.toRows(parsed.rows)
    state.value = {
      fileName: target.fileName,
      rows,
      needsCheck: countNeedsCheck(parsed.issues, skipped),
      error: rows.length === 0 ? config.emptyMessage : null,
    }
    lastLoaded.value = { ...target, reopened: false }
  }

  const loadFile = async (file: File): Promise<void> => {
    try {
      const workbook = await readWorkbook(file)
      const sheet = pickDefaultSheet(workbook)
      if (!sheet) {
        fail('데이터가 있는 시트를 찾지 못했어요')
        return
      }
      const detection = detectColumns(sheet.rows, config.specs)
      const signature = getSignature(detection.headers)
      // 같은 양식에서 사용자가 지정해 둔 매핑이 있으면 그것을 우선한다
      const mapping = adjust(loadMapping(signature, config.specs.map(spec => spec.key)) ?? detection.mapping)
      const target: PendingMapping = {
        fileName: file.name, sheet, headerRowIndex: detection.headerRowIndex, headers: detection.headers, mapping, signature, specs: config.specs, reopened: false,
      }
      if (config.isComplete(mapping)) finalize(target)
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
    const adjusted = adjust(mapping)
    if (!config.isComplete(adjusted)) {
      // 다시 지정 중이었다면 이미 불러온 데이터는 지우지 않고 안내만 띄운다
      if (target.reopened) state.value = { ...state.value, error: config.incompleteMessage }
      else fail(config.incompleteMessage)
      return
    }
    saveMapping(target.signature, mapping)
    finalize({ ...target, mapping: adjusted })
  }

  const cancelMapping = (): void => {
    const target = pending.value
    if (!target) return
    pending.value = null
    // 처음 불러오다 취소하면 파일을 불러오지 않은 것으로, 다시 지정하다 취소하면 이미 불러온 데이터를 그대로 둔다
    if (!target.reopened) fail('컬럼 매핑이 취소되어 파일을 불러오지 않았어요')
  }

  // 자동으로 잡은(또는 예전에 저장한) 매핑이 틀렸을 때 모달을 다시 연다
  const reopenMapping = (): void => {
    if (lastLoaded.value) pending.value = { ...lastLoaded.value, reopened: true }
  }

  return { state, pending, canReopen, loadFile, confirmMapping, cancelMapping, reopenMapping }
}
