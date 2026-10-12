import type { CardApproval } from '~/types/card'
import type { ColumnMapping, ParseIssue, RawSheet } from '~/types/excel'
import type { RiskCounts, RiskFinding, RiskLevel, RiskSort, RiskTag } from '~/types/risk'
import type { CardFieldKey } from '~/utils/cardSpecs'

export type ScannerSource = {
  fileName: string | null
  needsCheck: number // 값을 해석하지 못해 확인이 필요한 행 수
  offsetCount: number // 짝을 찾아 상계한 취소 건수
  unmatchedCancels: number // 원 승인을 찾지 못한 취소 건수
  error: string | null
}

// 필수 열을 자동으로 찾지 못해 사용자의 컬럼 매핑을 기다리는 파일
export type ScannerPending = {
  fileName: string
  sheet: RawSheet
  headerRowIndex: number
  headers: string[]
  mapping: ColumnMapping
  signature: string
}

type UseRiskScannerReturn = {
  source: Readonly<Ref<ScannerSource>>
  pending: Readonly<Ref<ScannerPending | null>>
  enabledTags: Ref<RiskTag[]>
  levels: Ref<RiskLevel[]>
  sort: Ref<RiskSort>
  explanations: Ref<Record<string, string>>
  counts: ComputedRef<RiskCounts>
  shown: ComputedRef<RiskFinding[]>
  loadFile: (file: File) => Promise<void>
  confirmMapping: (mapping: ColumnMapping) => void
  cancelMapping: () => void
}

const emptySource = (error: string | null = null): ScannerSource => ({ fileName: null, needsCheck: 0, offsetCount: 0, unmatchedCancels: 0, error })

const countNeedsCheck = (issues: readonly ParseIssue[], skipped: readonly number[]): number =>
  new Set([...issues.map(issue => issue.rowIndex), ...skipped]).size

// Tab 2 상태: 파일 읽기 → 컬럼 매핑 → 정규화 → 취소 상계 → 규칙 적용. 모두 브라우저 메모리 안에서만 처리한다
export const useRiskScanner = (): UseRiskScannerReturn => {
  const { readWorkbook, pickDefaultSheet, detectColumns, parseSheet } = useExcelReader()
  const { getSignature, loadMapping, saveMapping } = useColumnMapping()

  const source = ref<ScannerSource>(emptySource())
  const pending = ref<ScannerPending | null>(null)
  const approvals = shallowRef<CardApproval[]>([])
  const enabledTags = ref<RiskTag[]>([...DEFAULT_ENABLED_TAGS])
  const levels = ref<RiskLevel[]>(['HIGH', 'MEDIUM'])
  const sort = ref<RiskSort>('score')
  const explanations = ref<Record<string, string>>({})

  // 규칙을 켜고 끄면 곧바로 다시 계산한다 (승인 건수가 수만 건이어도 수백 ms 수준)
  const findings = computed<RiskFinding[]>(() => scanApprovals(approvals.value, new Set(enabledTags.value)))
  const counts = computed<RiskCounts>(() => countFindings(approvals.value.length, findings.value))
  const shown = computed<RiskFinding[]>(() => sortFindings(findings.value.filter(finding => levels.value.includes(finding.level)), sort.value))

  const fail = (message: string): void => {
    source.value = emptySource(message)
    approvals.value = []
    explanations.value = {}
  }

  const finalize = (target: ScannerPending): void => {
    const parsed = parseSheet(target.sheet, target.fileName, target.headerRowIndex, target.mapping as ColumnMapping<CardFieldKey>, CARD_FIELDS)
    const { rows, skipped } = toCardApprovals(parsed.rows)
    const { active, offsetCount, unmatchedCancels } = offsetCancellations(rows)
    approvals.value = active
    explanations.value = {}
    source.value = {
      fileName: target.fileName,
      needsCheck: countNeedsCheck(parsed.issues, skipped),
      offsetCount,
      unmatchedCancels,
      error: rows.length === 0 ? '검사할 수 있는 행이 없어요. 컬럼 매핑을 확인해 주세요' : null,
    }
  }

  const loadFile = async (file: File): Promise<void> => {
    try {
      const workbook = await readWorkbook(file)
      const sheet = pickDefaultSheet(workbook)
      if (!sheet) {
        fail('데이터가 있는 시트를 찾지 못했어요')
        return
      }
      const detection = detectColumns(sheet.rows, CARD_FIELDS)
      const signature = getSignature(detection.headers)
      // 같은 양식에서 사용자가 지정해 둔 매핑이 있으면 그것을 우선한다
      const mapping = loadMapping(signature, CARD_FIELDS.map(field => field.key)) ?? detection.mapping
      const target: ScannerPending = { fileName: file.name, sheet, headerRowIndex: detection.headerRowIndex, headers: detection.headers, mapping, signature }
      if (isCardMappingComplete(mapping)) finalize(target)
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
    if (!isCardMappingComplete(mapping)) {
      fail('승인일시(또는 승인일자), 카드번호, 가맹점명, 승인금액 열을 지정해 주세요')
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

  return { source, pending, enabledTags, levels, sort, explanations, counts, shown, loadFile, confirmMapping, cancelMapping }
}
