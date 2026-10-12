import type { SheetData } from '~/composables/useExcelWriter'
import type { MatchStatus, ReconcileOptions, ReconcileOutput, ReconcileResult } from '~/types/reconcile'

const STATUS_LABELS: Record<MatchStatus, string> = {
  MATCHED: '일치',
  REVIEW: '검토 필요',
  MISSING: '누락 의심',
  AMOUNT_MISMATCH: '금액 불일치',
  INVOICE_ONLY: '계산서만 존재',
  EXCLUDED: '자동 제외',
}

export const statusLabel = (status: MatchStatus): string => STATUS_LABELS[status]

// 통장 방향에 맞는 거래처: 출금이면 공급자, 입금이면 공급받는자
export const invoicePartner = (result: ReconcileResult): string => {
  const { bank, invoice } = result
  if (!invoice) return ''
  if (bank) return bank.direction === 'OUT' ? invoice.supplierName : invoice.buyerName
  return invoice.kind === 'SALES' ? invoice.buyerName : invoice.supplierName
}

const bankColumns = (result: ReconcileResult): (string | number | Date | null)[] => [
  result.bank?.date ?? null,
  result.bank ? directionLabel(result.bank.direction) : null,
  result.bank?.amount ?? null,
  result.bank?.description ?? null,
]

const sheetOf = (name: string, header: string[], results: readonly ReconcileResult[], pick: (result: ReconcileResult) => SheetData['rows'][number]): SheetData => ({
  name,
  header,
  rows: results.map(pick),
})

// 결과 엑셀의 시트 구성 (PRD 5.1 + 금액 불일치 시트)
export const buildReconcileSheets = (output: ReconcileOutput, options: ReconcileOptions): SheetData[] => {
  const of = (status: MatchStatus): ReconcileResult[] => output.results.filter(result => result.status === status)
  const bankHeader = ['거래일', '구분', '금액', '적요']
  const total = output.results.length

  const summaryRows: SheetData['rows'][number][] = [
    ['전체', total, null],
    ...(Object.keys(STATUS_LABELS) as MatchStatus[]).map((status): SheetData['rows'][number] =>
      [STATUS_LABELS[status], output.summary[status].count, output.summary[status].amount]),
    [null, null, null],
    ['[사용 옵션]', null, null],
    ['날짜 윈도우(±일)', options.dateWindowDays, null],
    ['금액 허용오차(원)', options.amountTolerance, null],
    ['우리 회사 사업자번호', output.ourBizNo ? `${formatBizNo(output.ourBizNo)}${output.isOurBizNoEstimated ? ' (추정)' : ''}` : '(판별 안 됨)', null],
    ['자동 제외', options.excludeKeywords.length > 0 ? options.excludeKeywords.join(', ') : '사용 안 함', null],
  ]

  return [
    { name: '요약', header: ['구분', '건수', '금액 합계'], rows: summaryRows },
    sheetOf('누락의심', [...bankHeader, '사유'], of('MISSING'), r => [...bankColumns(r), r.reason]),
    sheetOf('금액불일치', [...bankHeader, '계산서 작성일', '계산서 상호', '계산서 합계', '차액(통장-계산서)', '사유'], of('AMOUNT_MISMATCH'),
      r => [...bankColumns(r), r.invoice?.issueDate ?? null, invoicePartner(r), r.invoice?.totalAmount ?? null, r.amountDiff, r.reason]),
    sheetOf('검토필요', [...bankHeader, '계산서 작성일', '계산서 상호', '계산서 합계', '금액 점수', '날짜 점수', '상호 점수', '종합 점수'], of('REVIEW'),
      r => [...bankColumns(r), r.invoice?.issueDate ?? null, invoicePartner(r), r.invoice?.totalAmount ?? null,
        r.score?.amount ?? null, r.score ? Number(r.score.date.toFixed(3)) : null, r.score ? Number(r.score.name.toFixed(3)) : null, r.score ? Number(r.score.total.toFixed(3)) : null]),
    sheetOf('일치', [...bankHeader, '계산서 승인번호'], of('MATCHED'), r => [...bankColumns(r), r.invoice?.approvalNo ?? null]),
    sheetOf('계산서만존재', ['작성일', '거래처', '사업자번호', '합계금액'], of('INVOICE_ONLY'),
      r => [r.invoice?.issueDate ?? null, invoicePartner(r), r.invoice ? formatBizNo(r.invoice.kind === 'SALES' ? r.invoice.buyerBizNo : r.invoice.supplierBizNo) : null, r.invoice?.totalAmount ?? null]),
  ]
}
