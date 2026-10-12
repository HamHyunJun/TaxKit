import assert from 'node:assert/strict'
import test from 'node:test'
import type { BankTransaction } from '../../app/types/bank.ts'
import type { TaxInvoice } from '../../app/types/invoice.ts'
import type { ReconcileResult } from '../../app/types/reconcile.ts'
import { DEFAULT_RECONCILE_OPTIONS, filterResults, runReconcile, toMissingEvidenceRows } from '../../app/utils/reconcile.ts'
import { buildReconcileSheets } from '../../app/utils/reconcileExport.ts'
import { isMappingComplete, toBankTransactions } from '../../app/utils/reconcileSpecs.ts'

const OUR = '1111111111'
const options = { ...DEFAULT_RECONCILE_OPTIONS, ourBizNo: OUR }
let seq = 0
const day = (d: number): Date => new Date(2026, 8, d)
const bank = (d: number, description: string, amount: number, direction: 'IN' | 'OUT' = 'OUT'): BankTransaction => {
  seq += 1
  return { id: `bank-${seq}`, rowIndex: seq, date: day(d), description, direction, amount, balance: null, memo: null }
}
const invoice = (d: number, supplier: string, buyer: string, total: number, supplierBizNo = '2222222222', buyerBizNo = OUR): TaxInvoice => {
  seq += 1
  return {
    id: `invoice-${seq}`, rowIndex: seq, issueDate: day(d), approvalNo: null, supplierBizNo, supplierName: supplier, buyerBizNo, buyerName: buyer,
    supplyAmount: Math.round(total / 1.1), taxAmount: total - Math.round(total / 1.1), totalAmount: total, kind: null,
  }
}
const statusOf = (results: ReconcileResult[], bankId: string): string | undefined => results.find(r => r.bank?.id === bankId)?.status

test('대사: 일치·검토·누락·금액 불일치·제외·계산서만 존재를 구분한다', () => {
  seq = 0
  const banks = [
    bank(3, '(주)한빛상사', 1_100_000), // bank-1: 일치
    bank(7, '대성물산', 550_000), // bank-2: 5일 차이 + 상호가 달라 검토
    bank(7, '새한유통', 330_000), // bank-3: 누락
    bank(8, '미래건설', 2_000_000), // bank-4: 금액 불일치
    bank(9, '이자 지급', 1_234), // bank-5: 자동 제외
    bank(12, '입금처', 770_000, 'IN'), // bank-6: 매출 계산서와 일치
    bank(20, '한빛상사', 1_100_000), // bank-7: 같은 금액이지만 이미 짝지어짐/날짜 밖
  ]
  const invoices = [
    invoice(3, '한빛상사', '우리', 1_100_000),
    invoice(2, '대성산업', '우리', 550_000),
    invoice(10, '미래건설', '우리', 1_800_000),
    invoice(12, '우리', '입금처', 770_000, OUR, '3333333333'),
    invoice(25, '고아상사', '우리', 99_000),
  ]
  const out = runReconcile(banks, invoices, options)
  assert.equal(statusOf(out.results, 'bank-1'), 'MATCHED')
  assert.equal(statusOf(out.results, 'bank-2'), 'REVIEW')
  assert.equal(statusOf(out.results, 'bank-3'), 'MISSING')
  assert.equal(statusOf(out.results, 'bank-4'), 'AMOUNT_MISMATCH')
  assert.equal(out.results.find(r => r.bank?.id === 'bank-4')?.amountDiff, 200_000)
  assert.equal(statusOf(out.results, 'bank-5'), 'EXCLUDED')
  assert.equal(statusOf(out.results, 'bank-6'), 'MATCHED')
  assert.equal(statusOf(out.results, 'bank-7'), 'MISSING')
  assert.equal(out.summary.INVOICE_ONLY.count, 1)
  assert.equal(filterResults(out.results, 'missing').length, 2)
  assert.equal(toMissingEvidenceRows(out.results).length, 2)
})

test('대사: 사업자번호를 비우면 가장 많이 나온 번호로 추정한다', () => {
  seq = 0
  const out = runReconcile([bank(3, '한빛상사', 1_100)], [invoice(3, '한빛상사', '우리', 1_100), invoice(4, '다른곳', '우리', 5_000, '3333333333')], DEFAULT_RECONCILE_OPTIONS)
  assert.equal(out.ourBizNo, OUR)
  assert.equal(out.isOurBizNoEstimated, true)
})

test('대사: 허용오차와 날짜 윈도우를 지킨다', () => {
  seq = 0
  const within = runReconcile([bank(3, '한빛상사', 1_100_010)], [invoice(3, '한빛상사', '우리', 1_100_000)], { ...options, amountTolerance: 10 })
  assert.equal(within.results[0]?.status, 'MATCHED')
  seq = 0
  const outside = runReconcile([bank(4, '한빛상사', 1_100_000)], [invoice(3, '한빛상사', '우리', 1_100_000)], { ...options, dateWindowDays: 0 })
  assert.equal(outside.results.find(r => r.bank)?.status, 'MISSING')
})

test('대사 결과는 실행 당시 옵션을 기록하고, 이후 옵션을 바꿔도 변하지 않는다 (결과 엑셀 요약이 틀리던 버그)', () => {
  seq = 0
  const mutable = { ...options, dateWindowDays: 5 }
  const out = runReconcile([bank(3, '한빛상사', 1_100)], [invoice(3, '한빛상사', '우리', 1_100)], mutable)
  mutable.dateWindowDays = 10
  mutable.excludeKeywords.push('추가')
  assert.equal(out.options.dateWindowDays, 5)
  assert.ok(!out.options.excludeKeywords.includes('추가'))
  const summary = buildReconcileSheets(out)[0]?.rows.find(row => row[0] === '날짜 윈도우(±일)')
  assert.equal(summary?.[1], 5)
})

test('대사 결과 엑셀: 6개 시트이고 모든 행의 열 수가 헤더와 같다', () => {
  seq = 0
  const out = runReconcile([bank(3, '한빛상사', 1_100), bank(9, '새한유통', 330)], [invoice(3, '한빛상사', '우리', 1_100), invoice(20, '고요출판', '우리', 154)], options)
  const sheets = buildReconcileSheets(out)
  assert.deepEqual(sheets.map(s => s.name), ['요약', '누락의심', '금액불일치', '검토필요', '일치', '계산서만존재'])
  for (const sheet of sheets) for (const row of sheet.rows) assert.equal(row.length, sheet.header.length, sheet.name)
})

test('통장 변환: 출금/입금 열, 거래금액+구분, 필수 열 판정', () => {
  const rec = (over: Record<string, unknown>): never => ({ date: day(1), description: 'x', withdrawal: null, deposit: null, amount: null, direction: null, balance: null, memo: null, rowIndex: 2, ...over }) as never
  const converted = toBankTransactions([rec({ withdrawal: 500 }), rec({ deposit: 700 }), rec({ amount: 300, direction: '출금' }), rec({ amount: -300 }), rec({})])
  assert.deepEqual(converted.rows.map(r => `${r.direction}${r.amount}`), ['OUT500', 'IN700', 'OUT300', 'OUT300'])
  assert.equal(converted.skipped.length, 1)
  assert.equal(isMappingComplete('bank', { date: 0, description: 1 }), false)
  assert.equal(isMappingComplete('bank', { date: 0, description: 1, deposit: 2 }), true)
})

test('대사: 같은 금액이 몰려도 메모리·시간이 폭증하지 않고 모두 짝지어진다', () => {
  seq = 0
  const n = 3000
  const banks = Array.from({ length: n }, (_, i) => bank(1 + (i % 28), `거래처${i % 40}`, 11_000))
  const invoices = Array.from({ length: n }, (_, i) => invoice(1 + (i % 28), `거래처${i % 40}`, '우리', 11_000))
  const started = performance.now()
  const out = runReconcile(banks, invoices, options)
  const elapsed = performance.now() - started
  assert.equal(out.summary.MATCHED.count + out.summary.REVIEW.count, n)
  assert.ok(elapsed < 3000, `동일 금액 ${n}건 대사가 ${Math.round(elapsed)}ms 걸렸다`)
})
