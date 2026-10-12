import type { CardApproval } from '~/types/card'
import type { ColumnMapping } from '~/types/excel'
import type { RiskCounts, RiskFinding, RiskLevel, RiskSort, RiskTag } from '~/types/risk'
import type { CardFieldKey } from '~/utils/cardSpecs'
import type { PendingMapping } from '~/composables/useSheetSource'

type ScannerSource = {
  fileName: string | null
  needsCheck: number // 값을 해석하지 못해 확인이 필요한 행 수
  offsetCount: number // 짝을 찾아 상계한 취소 건수
  unmatchedCancels: number // 원 승인을 찾지 못한 취소 건수
  error: string | null
}

type UseRiskScannerReturn = {
  source: ComputedRef<ScannerSource>
  pending: Readonly<Ref<PendingMapping | null>>
  enabledTags: Ref<RiskTag[]>
  levels: Ref<RiskLevel[]>
  sort: Ref<RiskSort>
  explanations: Ref<Record<string, string>>
  counts: ComputedRef<RiskCounts>
  shown: ComputedRef<RiskFinding[]>
  holidayOutOfRange: ComputedRef<boolean>
  canReopen: ComputedRef<boolean>
  loadFile: (file: File) => Promise<void>
  confirmMapping: (mapping: ColumnMapping) => void
  cancelMapping: () => void
  reopenMapping: () => void
}

// Tab 2 상태: 파일 읽기 → 컬럼 매핑 → 정규화 → 취소 상계 → 규칙 적용. 모두 브라우저 메모리 안에서만 처리한다
export const useRiskScanner = (): UseRiskScannerReturn => {
  const card = useSheetSource<CardFieldKey, CardApproval>({
    specs: CARD_FIELDS,
    isComplete: isCardMappingComplete,
    incompleteMessage: '승인일시(또는 승인일자), 카드번호, 가맹점명, 승인금액 열을 지정해 주세요',
    emptyMessage: '검사할 수 있는 행이 없어요. 컬럼 매핑을 확인해 주세요',
    toRows: toCardApprovals,
  })

  const enabledTags = ref<RiskTag[]>([...DEFAULT_ENABLED_TAGS])
  const levels = ref<RiskLevel[]>(['HIGH', 'MEDIUM'])
  const sort = ref<RiskSort>('score')
  const explanations = ref<Record<string, string>>({})

  // 취소 건은 원 승인과 짝지어 함께 뺀 나머지를 검사한다
  const offset = computed(() => offsetCancellations(card.state.value.rows))
  const approvals = computed<CardApproval[]>(() => offset.value.active)

  // 다른 파일을 불러오면 이전 파일에 입력한 소명 내용은 버린다 (같은 파일의 컬럼 다시 지정은 행 id가 그대로라 유지한다)
  watch(() => card.state.value.fileName, () => {
    explanations.value = {}
  })

  const source = computed<ScannerSource>(() => ({
    fileName: card.state.value.fileName,
    needsCheck: card.state.value.needsCheck,
    offsetCount: offset.value.offsetCount,
    unmatchedCancels: offset.value.unmatchedCancels,
    error: card.state.value.error,
  }))

  // 규칙을 켜고 끄면 곧바로 다시 계산한다 (승인 건수가 수만 건이어도 수백 ms 수준)
  const findings = computed<RiskFinding[]>(() => scanApprovals(approvals.value, new Set(enabledTags.value)))
  const counts = computed<RiskCounts>(() => countFindings(approvals.value.length, findings.value))
  const shown = computed<RiskFinding[]>(() => sortFindings(findings.value.filter(finding => levels.value.includes(finding.level)), sort.value))

  // 공휴일 표 밖의 연도가 있으면 공휴일 규칙이 그 날짜를 판정하지 못하므로 화면에서 알린다
  const holidayOutOfRange = computed<boolean>(() =>
    enabledTags.value.includes('HOLIDAY') && approvals.value.some(approval => !isInHolidayTable(approval.approvedAt)),
  )

  return {
    source,
    pending: card.pending,
    enabledTags,
    levels,
    sort,
    explanations,
    counts,
    shown,
    holidayOutOfRange,
    canReopen: card.canReopen,
    loadFile: card.loadFile,
    confirmMapping: card.confirmMapping,
    cancelMapping: card.cancelMapping,
    reopenMapping: card.reopenMapping,
  }
}
