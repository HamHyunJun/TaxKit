import type { BankTransaction } from '~/types/bank'
import type { ColumnMapping } from '~/types/excel'
import type { TaxInvoice } from '~/types/invoice'
import type { ReconcileOptions, ReconcileOutput } from '~/types/reconcile'
import type { BankFieldKey, InvoiceFieldKey, SourceKind } from '~/utils/reconcileSpecs'
import type { PendingMapping, SheetSourceState } from '~/composables/useSheetSource'

type UseReconcileReturn = {
  bank: Readonly<Ref<SheetSourceState<BankTransaction>>>
  invoice: Readonly<Ref<SheetSourceState<TaxInvoice>>>
  pending: ComputedRef<PendingMapping | null>
  options: Ref<ReconcileOptions>
  output: Readonly<Ref<ReconcileOutput | null>>
  isRunning: Readonly<Ref<boolean>>
  runError: Readonly<Ref<string | null>>
  canRun: ComputedRef<boolean>
  loadFile: (kind: SourceKind, file: File) => Promise<void>
  confirmMapping: (mapping: ColumnMapping) => void
  cancelMapping: () => void
  reopenMapping: (kind: SourceKind) => void
  canReopenBank: ComputedRef<boolean>
  canReopenInvoice: ComputedRef<boolean>
  run: () => Promise<void>
}

// Tab 1 상태: 두 파일의 읽기 → 컬럼 매핑 → 정규화 → 대사 실행. 모두 브라우저 메모리 안에서만 처리한다
export const useReconcile = (): UseReconcileReturn => {
  const bankSource = useSheetSource<BankFieldKey, BankTransaction>({
    specs: BANK_FIELDS,
    isComplete: mapping => isMappingComplete('bank', mapping),
    incompleteMessage: '입금·출금 또는 거래금액 열을 지정해 주세요',
    emptyMessage: '대사할 수 있는 행이 없어요. 컬럼 매핑을 확인해 주세요',
    toRows: toBankTransactions,
  })
  const invoiceSource = useSheetSource<InvoiceFieldKey, TaxInvoice>({
    specs: INVOICE_FIELDS,
    isComplete: mapping => isMappingComplete('invoice', mapping),
    incompleteMessage: '필수 열을 모두 지정해 주세요',
    emptyMessage: '대사할 수 있는 행이 없어요. 컬럼 매핑을 확인해 주세요',
    toRows: toTaxInvoices,
  })
  const bank = bankSource.state
  const invoice = invoiceSource.state
  const sourceOf = (kind: SourceKind): typeof bankSource | typeof invoiceSource => (kind === 'bank' ? bankSource : invoiceSource)

  // 모달은 한 번에 하나만 열리므로, 매핑을 기다리는 쪽의 상태를 그대로 노출한다
  const pending = computed<PendingMapping | null>(() => bankSource.pending.value ?? invoiceSource.pending.value)
  const owner = (): typeof bankSource | typeof invoiceSource => (bankSource.pending.value ? bankSource : invoiceSource)

  const options = ref<ReconcileOptions>({ ...DEFAULT_RECONCILE_OPTIONS, excludeKeywords: [...DEFAULT_RECONCILE_OPTIONS.excludeKeywords] })
  const output = shallowRef<ReconcileOutput | null>(null)
  const isRunning = ref<boolean>(false)
  const runError = ref<string | null>(null)

  const canRun = computed<boolean>(() => bank.value.rows.length > 0 && invoice.value.rows.length > 0 && !isRunning.value)

  // 파일이 바뀌면 이전 결과는 더 이상 맞지 않는다
  watch([bank, invoice], () => {
    output.value = null
  })

  const run = async (): Promise<void> => {
    if (!canRun.value) return
    isRunning.value = true
    runError.value = null
    try {
      // 계산이 화면을 막기 전에 "계산 중" 상태가 먼저 그려지도록 한 틱 양보한다
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      output.value = runReconcile(bank.value.rows, invoice.value.rows, options.value)
    }
    catch {
      output.value = null
      runError.value = '대사 중 오류가 났어요. 컬럼 매핑과 값을 확인한 뒤 다시 실행해 주세요.'
    }
    finally {
      isRunning.value = false
    }
  }

  return {
    bank,
    invoice,
    pending,
    options,
    output,
    isRunning,
    runError,
    canRun,
    loadFile: (kind, file) => sourceOf(kind).loadFile(file),
    confirmMapping: mapping => owner().confirmMapping(mapping),
    cancelMapping: () => owner().cancelMapping(),
    reopenMapping: kind => sourceOf(kind).reopenMapping(),
    canReopenBank: bankSource.canReopen,
    canReopenInvoice: invoiceSource.canReopen,
    run,
  }
}
