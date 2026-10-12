import type { BankTransaction } from '~/types/bank'
import type { TaxInvoice } from '~/types/invoice'

export type MatchStatus = 'MATCHED' | 'REVIEW' | 'MISSING' | 'AMOUNT_MISMATCH' | 'INVOICE_ONLY' | 'EXCLUDED'

// 결과 화면의 필터 탭: 일치(검토 포함) / 누락 의심 / 금액 불일치
export type ReconcileFilter = 'matched' | 'missing' | 'mismatch'

export type ScoreBreakdown = {
  amount: number // 0 | 1
  date: number // 0~1
  name: number // 0~1
  total: number // 가중합
}

export type ReconcileResult = {
  id: string
  status: MatchStatus
  bank: BankTransaction | null
  invoice: TaxInvoice | null
  score: ScoreBreakdown | null
  dayDiff: number | null
  amountDiff: number | null // 통장금액 - 계산서 합계금액 (AMOUNT_MISMATCH에서만)
  reason: string // 판정 근거 (설명 가능한 결과)
}

export type ReconcileOptions = {
  dateWindowDays: number // 기본 5
  amountTolerance: number // 기본 0
  ourBizNo: string | null // 숫자 10자리
  excludeKeywords: string[] // 빈 배열이면 자동 제외 끔
}

export type ReconcileSummary = Record<MatchStatus, { count: number, amount: number }>

export type ReconcileOutput = {
  results: ReconcileResult[]
  summary: ReconcileSummary
  ourBizNo: string | null // 실제 판별에 쓴 사업자번호
  isOurBizNoEstimated: boolean
}
