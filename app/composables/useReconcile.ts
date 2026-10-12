import type { BankTransaction } from '~/types/bank'
import type { ColumnMapping, ParseIssue, RawSheet } from '~/types/excel'
import type { TaxInvoice } from '~/types/invoice'
import type { ReconcileOptions, ReconcileOutput } from '~/types/reconcile'
import type { BankFieldKey, InvoiceFieldKey, SourceKind } from '~/utils/reconcileSpecs'

export type SourceState<T> = {
  fileName: string | null
  rows: T[]
  needsCheck: number // 값을 해석하지 못해 확인이 필요한 행 수
  error: string | null
}

// 필수 열을 자동으로 찾지 못해 사용자의 컬럼 매핑을 기다리는 파일
export type PendingMapping = {
  kind: SourceKind
  fileName: string
  sheet: RawSheet
  headerRowIndex: number
  headers: string[]
  mapping: ColumnMapping
  signature: string
}

type UseReconcileReturn = {
  bank: Readonly<Ref<SourceState<BankTransaction>>>
  invoice: Readonly<Ref<SourceState<TaxInvoice>>>
  pending: Readonly<Ref<PendingMapping | null>>
  options: Ref<ReconcileOptions>
  output: Readonly<Ref<ReconcileOutput | null>>
  isRunning: Readonly<Ref<boolean>>
  canRun: ComputedRef<boolean>
  loadFile: (kind: SourceKind, file: File) => Promise<void>
  confirmMapping: (mapping: ColumnMapping) => void
  cancelMapping: () => void
  run: () => Promise<void>
}

const emptySource = <T>(): SourceState<T> => ({ fileName: null, rows: [], needsCheck: 0, error: null })

// 파싱 이슈가 있는 행과 변환하지 못한 행을 합쳐 "확인 필요" 건수를 센다
const countNeedsCheck = (issues: readonly ParseIssue[], skipped: readonly number[]): number =>
  new Set([...issues.map(issue => issue.rowIndex), ...skipped]).size

// Tab 1 상태: 두 파일의 읽기 → 컬럼 매핑 → 정규화 → 대사 실행. 모두 브라우저 메모리 안에서만 처리한다
export const useReconcile = (): UseReconcileReturn => {
  const { readWorkbook, pickDefaultSheet, detectColumns, parseSheet } = useExcelReader()
  const { getSignature, loadMapping, saveMapping } = useColumnMapping()

  const bank = ref<SourceState<BankTransaction>>(emptySource())
  const invoice = ref<SourceState<TaxInvoice>>(emptySource())
  const pending = ref<PendingMapping | null>(null)
  const options = ref<ReconcileOptions>({ ...DEFAULT_RECONCILE_OPTIONS, excludeKeywords: [...DEFAULT_RECONCILE_OPTIONS.excludeKeywords] })
  const output = shallowRef<ReconcileOutput | null>(null)
  const isRunning = ref<boolean>(false)

  const canRun = computed<boolean>(() => bank.value.rows.length > 0 && invoice.value.rows.length > 0 && !isRunning.value)

  const setError = (kind: SourceKind, message: string | null): void => {
    if (kind === 'bank') bank.value = { ...emptySource(), error: message }
    else invoice.value = { ...emptySource(), error: message }
    output.value = null
  }

  // 매핑이 확정된 시트를 정규화해 상태에 반영한다
  const finalize = (target: PendingMapping): void => {
    const { sheet, fileName, headerRowIndex } = target
    if (target.kind === 'bank') {
      const parsed = parseSheet(sheet, fileName, headerRowIndex, target.mapping as ColumnMapping<BankFieldKey>, BANK_FIELDS)
      const { rows, skipped } = toBankTransactions(parsed.rows)
      bank.value = { fileName, rows, needsCheck: countNeedsCheck(parsed.issues, skipped), error: rows.length === 0 ? '대사할 수 있는 행이 없어요. 컬럼 매핑을 확인해 주세요' : null }
    }
    else {
      const parsed = parseSheet(sheet, fileName, headerRowIndex, target.mapping as ColumnMapping<InvoiceFieldKey>, INVOICE_FIELDS)
      const { rows, skipped } = toTaxInvoices(parsed.rows)
      invoice.value = { fileName, rows, needsCheck: countNeedsCheck(parsed.issues, skipped), error: rows.length === 0 ? '대사할 수 있는 행이 없어요. 컬럼 매핑을 확인해 주세요' : null }
    }
    output.value = null
  }

  const loadFile = async (kind: SourceKind, file: File): Promise<void> => {
    try {
      const workbook = await readWorkbook(file)
      const sheet = pickDefaultSheet(workbook)
      if (!sheet) {
        setError(kind, '데이터가 있는 시트를 찾지 못했어요')
        return
      }
      const specs = FIELDS_BY_KIND[kind]
      const detection = detectColumns(sheet.rows, specs)
      const signature = getSignature(detection.headers)
      // 같은 양식에서 사용자가 지정해 둔 매핑이 있으면 그것을 우선한다
      const mapping = loadMapping(signature, specs.map(spec => spec.key)) ?? detection.mapping
      const target: PendingMapping = {
        kind, fileName: file.name, sheet, headerRowIndex: detection.headerRowIndex, headers: detection.headers, mapping, signature,
      }
      if (isMappingComplete(kind, mapping)) finalize(target)
      else pending.value = target
    }
    catch (error) {
      setError(kind, error instanceof Error ? error.message : '파일을 처리하지 못했어요')
    }
  }

  const confirmMapping = (mapping: ColumnMapping): void => {
    const target = pending.value
    if (!target) return
    pending.value = null
    if (!isMappingComplete(target.kind, mapping)) {
      setError(target.kind, target.kind === 'bank' ? '입금·출금 또는 거래금액 열을 지정해 주세요' : '필수 열을 모두 지정해 주세요')
      return
    }
    saveMapping(target.signature, mapping)
    finalize({ ...target, mapping })
  }

  const cancelMapping = (): void => {
    const target = pending.value
    if (!target) return
    pending.value = null
    setError(target.kind, '컬럼 매핑이 취소되어 파일을 불러오지 않았어요')
  }

  const run = async (): Promise<void> => {
    if (!canRun.value) return
    isRunning.value = true
    // 계산이 화면을 막기 전에 "계산 중" 상태가 먼저 그려지도록 한 틱 양보한다
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    output.value = runReconcile(bank.value.rows, invoice.value.rows, options.value)
    isRunning.value = false
  }

  return { bank, invoice, pending, options, output, isRunning, canRun, loadFile, confirmMapping, cancelMapping, run }
}
