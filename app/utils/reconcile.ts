import type { BankTransaction } from '~/types/bank'
import type { InvoiceKind, TaxInvoice } from '~/types/invoice'
import type { MissingEvidenceRow } from '~/types/message'
import type {
  ReconcileFilter,
  ReconcileOptions,
  ReconcileOutput,
  ReconcileResult,
  ReconcileSummary,
  ScoreBreakdown,
} from '~/types/reconcile'

const WEIGHT_AMOUNT = 0.5
const WEIGHT_DATE = 0.3
const WEIGHT_NAME = 0.2
const MATCHED_THRESHOLD = 0.8 // 이상이면 일치, 미만이면 검토 필요
const MISMATCH_NAME_THRESHOLD = 0.75 // 금액 불일치로 보려면 상호가 이만큼은 닮아야 한다

export const DEFAULT_EXCLUDE_KEYWORDS: readonly string[] = [
  '이자', '수수료', '급여', '국세', '지방세', '4대보험', '국민연금', '건강보험', '카드대금', '대체',
]

export const DEFAULT_RECONCILE_OPTIONS: ReconcileOptions = {
  dateWindowDays: 5,
  amountTolerance: 0,
  ourBizNo: null,
  excludeKeywords: [...DEFAULT_EXCLUDE_KEYWORDS],
}

type Candidate = {
  bank: BankTransaction
  invoice: TaxInvoice
  dayDiff: number
  score: ScoreBreakdown
}

type InvoiceKeys = { supplier: string, buyer: string } // normalizeCompanyName 적용 키

const emptySummary = (): ReconcileSummary => ({
  MATCHED: { count: 0, amount: 0 },
  REVIEW: { count: 0, amount: 0 },
  MISSING: { count: 0, amount: 0 },
  AMOUNT_MISMATCH: { count: 0, amount: 0 },
  INVOICE_ONLY: { count: 0, amount: 0 },
  EXCLUDED: { count: 0, amount: 0 },
})

export const summarize = (results: readonly ReconcileResult[]): ReconcileSummary => {
  const summary = emptySummary()
  for (const result of results) {
    const entry = summary[result.status]
    entry.count += 1
    entry.amount += result.bank?.amount ?? result.invoice?.totalAmount ?? 0
  }
  return summary
}

// 사업자번호가 가장 많이 등장하는 쪽을 우리 회사로 추정한다 (다수결)
export const inferOurBizNo = (invoices: readonly TaxInvoice[]): string | null => {
  if (invoices.length < 2) return null
  const counts = new Map<string, number>()
  for (const invoice of invoices) {
    for (const bizNo of [invoice.supplierBizNo, invoice.buyerBizNo]) counts.set(bizNo, (counts.get(bizNo) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [bizNo, count] of counts) {
    if (count > bestCount) {
      best = bizNo
      bestCount = count
    }
  }
  return best
}

const classifyInvoice = (invoice: TaxInvoice, ourBizNo: string | null): InvoiceKind | null => {
  if (ourBizNo === null) return null
  if (invoice.supplierBizNo === ourBizNo) return 'SALES'
  if (invoice.buyerBizNo === ourBizNo) return 'PURCHASE'
  return null
}

// 출금은 매입, 입금은 매출 계산서와 짝이 된다 (판별 불가(null)는 양쪽 모두 허용)
const isDirectionCompatible = (bank: BankTransaction, invoice: TaxInvoice): boolean =>
  invoice.kind === null || (bank.direction === 'OUT' ? invoice.kind === 'PURCHASE' : invoice.kind === 'SALES')

const scoreCandidate = (
  bank: BankTransaction,
  bankKey: string,
  invoice: TaxInvoice,
  keys: InvoiceKeys,
  windowDays: number,
  amountScore: number,
): Candidate | null => {
  const dayDiff = Math.abs(toDayNumber(bank.date) - toDayNumber(invoice.issueDate))
  if (dayDiff > windowDays) return null
  const date = 1 - dayDiff / (windowDays + 1)
  const name = nameSimilarity(bankKey, bank.direction === 'OUT' ? keys.supplier : keys.buyer)
  const total = WEIGHT_AMOUNT * amountScore + WEIGHT_DATE * date + WEIGHT_NAME * name
  return { bank, invoice, dayDiff, score: { amount: amountScore, date, name, total } }
}

const byScoreDesc = (a: Candidate, b: Candidate): number =>
  b.score.total - a.score.total || a.bank.rowIndex - b.bank.rowIndex || a.invoice.rowIndex - b.invoice.rowIndex

const percent = (value: number): string => `${Math.round(value * 100)}%`

const resultDate = (result: ReconcileResult): Date | null => result.bank?.date ?? result.invoice?.issueDate ?? null

// 통장 거래를 기준으로 계산서를 짝짓는다: 금액 버킷 → 날짜·상호 점수 → 점수순 탐욕 1:1 배정
export const runReconcile = (
  banks: readonly BankTransaction[],
  invoices: readonly TaxInvoice[],
  options: ReconcileOptions,
): ReconcileOutput => {
  const ourBizNo = options.ourBizNo ?? inferOurBizNo(invoices)
  const classified = invoices.map((invoice): TaxInvoice => ({ ...invoice, kind: classifyInvoice(invoice, ourBizNo) }))
  const results: ReconcileResult[] = []

  const targets: BankTransaction[] = []
  for (const bank of banks) {
    const keyword = options.excludeKeywords.find(word => bank.description.includes(word))
    if (keyword === undefined) {
      targets.push(bank)
      continue
    }
    results.push({
      id: `result-${bank.id}`, status: 'EXCLUDED', bank, invoice: null, score: null, dayDiff: null, amountDiff: null,
      reason: `적요에 '${keyword}'가 있어 대사에서 제외`,
    })
  }

  const invoiceKeys = new Map<string, InvoiceKeys>()
  const amountBuckets = new Map<number, TaxInvoice[]>()
  const dayBuckets = new Map<number, TaxInvoice[]>()
  const pushTo = (map: Map<number, TaxInvoice[]>, key: number, invoice: TaxInvoice): void => {
    const list = map.get(key)
    if (list) list.push(invoice)
    else map.set(key, [invoice])
  }
  for (const invoice of classified) {
    invoiceKeys.set(invoice.id, { supplier: normalizeCompanyName(invoice.supplierName), buyer: normalizeCompanyName(invoice.buyerName) })
    pushTo(amountBuckets, invoice.totalAmount, invoice)
    pushTo(dayBuckets, toDayNumber(invoice.issueDate), invoice)
  }
  const keysOf = (invoice: TaxInvoice): InvoiceKeys => invoiceKeys.get(invoice.id) ?? { supplier: '', buyer: '' }

  const window = options.dateWindowDays
  const tolerance = options.amountTolerance
  const bankKeys = new Map<string, string>(targets.map(bank => [bank.id, normalizeCompanyName(bank.description)]))
  const bankKeyOf = (bank: BankTransaction): string => bankKeys.get(bank.id) ?? ''

  // 1) 금액이 허용오차 안인 후보 중 날짜 윈도우 안의 쌍만 점수화한다
  const candidates: Candidate[] = []
  for (const bank of targets) {
    for (let diff = -tolerance; diff <= tolerance; diff++) {
      for (const invoice of amountBuckets.get(bank.amount + diff) ?? []) {
        if (!isDirectionCompatible(bank, invoice)) continue
        const candidate = scoreCandidate(bank, bankKeyOf(bank), invoice, keysOf(invoice), window, 1)
        if (candidate) candidates.push(candidate)
      }
    }
  }
  candidates.sort(byScoreDesc)

  // 2) 점수 높은 쌍부터 1:1 배정
  const usedBanks = new Set<string>()
  const usedInvoices = new Set<string>()
  for (const { bank, invoice, dayDiff, score } of candidates) {
    if (usedBanks.has(bank.id) || usedInvoices.has(invoice.id)) continue
    usedBanks.add(bank.id)
    usedInvoices.add(invoice.id)
    results.push({
      id: `result-${bank.id}`,
      status: score.total >= MATCHED_THRESHOLD ? 'MATCHED' : 'REVIEW',
      bank, invoice, score, dayDiff, amountDiff: null,
      reason: `금액 일치 · 날짜 ${dayDiff}일 차이 · 상호 유사도 ${percent(score.name)}`,
    })
  }

  // 3) 남은 통장 거래: 날짜·상호는 닮았지만 금액이 다른 계산서가 있으면 금액 불일치, 없으면 누락 의심
  for (const bank of targets) {
    if (usedBanks.has(bank.id)) continue
    const day = toDayNumber(bank.date)
    let best: Candidate | null = null
    for (let offset = -window; offset <= window; offset++) {
      for (const invoice of dayBuckets.get(day + offset) ?? []) {
        if (usedInvoices.has(invoice.id) || !isDirectionCompatible(bank, invoice)) continue
        const candidate = scoreCandidate(bank, bankKeyOf(bank), invoice, keysOf(invoice), window, 0)
        if (candidate && candidate.score.name >= MISMATCH_NAME_THRESHOLD && (!best || byScoreDesc(candidate, best) < 0)) best = candidate
      }
    }

    if (best) {
      usedInvoices.add(best.invoice.id)
      const amountDiff = bank.amount - best.invoice.totalAmount
      results.push({
        id: `result-${bank.id}`, status: 'AMOUNT_MISMATCH', bank, invoice: best.invoice, score: best.score, dayDiff: best.dayDiff, amountDiff,
        reason: `상호·날짜는 유사하나 금액이 ${formatWon(Math.abs(amountDiff))}원 ${amountDiff > 0 ? '더 많음' : '더 적음'} (통장 ${formatWon(bank.amount)} · 계산서 ${formatWon(best.invoice.totalAmount)})`,
      })
      continue
    }

    let sameAmountExists = false
    for (let diff = -tolerance; diff <= tolerance && !sameAmountExists; diff++) {
      sameAmountExists = (amountBuckets.get(bank.amount + diff) ?? []).some(invoice => isDirectionCompatible(bank, invoice))
    }
    results.push({
      id: `result-${bank.id}`, status: 'MISSING', bank, invoice: null, score: null, dayDiff: null, amountDiff: null,
      reason: sameAmountExists
        ? `동일 금액 계산서는 있으나 날짜 범위(±${window}일) 밖이거나 다른 거래와 이미 짝지어짐`
        : '동일 금액 계산서 없음',
    })
  }

  // 4) 짝이 없는 계산서
  for (const invoice of classified) {
    if (usedInvoices.has(invoice.id)) continue
    results.push({
      id: `result-${invoice.id}`, status: 'INVOICE_ONLY', bank: null, invoice, score: null, dayDiff: null, amountDiff: null,
      reason: '대응하는 통장 거래 없음',
    })
  }

  results.sort((a, b) => (resultDate(a)?.getTime() ?? 0) - (resultDate(b)?.getTime() ?? 0))
  return { results, summary: summarize(results), ourBizNo, isOurBizNoEstimated: options.ourBizNo === null && ourBizNo !== null }
}

// 필터 탭별 결과: 일치(검토 필요 포함) / 누락 의심 / 금액 불일치
export const filterResults = (results: readonly ReconcileResult[], filter: ReconcileFilter): ReconcileResult[] => {
  const statuses: Record<ReconcileFilter, readonly string[]> = {
    matched: ['MATCHED', 'REVIEW'],
    missing: ['MISSING'],
    mismatch: ['AMOUNT_MISMATCH'],
  }
  return results.filter(result => statuses[filter].includes(result.status))
}

// 누락 의심 건을 Tab 3 입력 형식으로 바꾼다. 거래처명은 통장 적요를 그대로 쓴다 (Tab 3에서 수정)
export const toMissingEvidenceRows = (results: readonly ReconcileResult[]): MissingEvidenceRow[] =>
  results.flatMap((result): MissingEvidenceRow[] =>
    result.status === 'MISSING' && result.bank
      ? [{
          partnerName: result.bank.description,
          partnerBizNo: null,
          date: result.bank.date,
          amount: result.bank.amount,
          description: result.bank.memo,
          contact: null,
        }]
      : [],
  )
