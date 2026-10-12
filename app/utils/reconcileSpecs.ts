import type { BankTransaction } from '~/types/bank'
import type { ColumnMapping, FieldSpec, FieldValue, ParsedRecord } from '~/types/excel'
import type { TaxInvoice } from '~/types/invoice'

export type SourceKind = 'bank' | 'invoice'
export type BankFieldKey = 'date' | 'description' | 'withdrawal' | 'deposit' | 'amount' | 'direction' | 'balance' | 'memo'
export type InvoiceFieldKey
  = | 'issueDate' | 'approvalNo' | 'supplierBizNo' | 'supplierName' | 'buyerBizNo' | 'buyerName'
    | 'supplyAmount' | 'taxAmount' | 'totalAmount'

// 컬럼 별칭 사전 (PRD 4.3 A, B). 입출금 금액 열은 조합이 다양해 required를 쓰지 않고 isMappingComplete에서 검사한다
export const BANK_FIELDS: readonly FieldSpec<BankFieldKey>[] = [
  { key: 'date', label: '거래일자', aliases: ['거래일자', '거래일', '거래일시', '일자', '날짜'], kind: 'date', required: true },
  { key: 'description', label: '적요(거래처)', aliases: ['적요', '기재내용', '내용', '거래내용', '받는분/보낸분', '의뢰인/수취인'], kind: 'text', required: true },
  { key: 'withdrawal', label: '출금액', aliases: ['출금액', '출금', '찾으신금액', '지급액'], kind: 'amount', required: false },
  { key: 'deposit', label: '입금액', aliases: ['입금액', '입금', '맡기신금액'], kind: 'amount', required: false },
  { key: 'amount', label: '거래금액 (입출금 열이 따로 없을 때)', aliases: ['거래금액'], kind: 'amount', required: false },
  { key: 'direction', label: '입출금 구분', aliases: ['구분', '입출금구분'], kind: 'text', required: false },
  { key: 'balance', label: '잔액', aliases: ['잔액', '거래후잔액'], kind: 'amount', required: false },
  { key: 'memo', label: '메모', aliases: ['메모', '비고', '거래점'], kind: 'text', required: false },
]

export const INVOICE_FIELDS: readonly FieldSpec<InvoiceFieldKey>[] = [
  { key: 'issueDate', label: '작성일자', aliases: ['작성일자', '작성일'], kind: 'date', required: true },
  { key: 'approvalNo', label: '승인번호', aliases: ['승인번호'], kind: 'text', required: false },
  { key: 'supplierBizNo', label: '공급자 사업자번호', aliases: ['공급자사업자등록번호', '공급자등록번호'], kind: 'bizNo', required: true },
  { key: 'supplierName', label: '공급자 상호', aliases: ['공급자상호', '상호(공급자)', '상호'], kind: 'text', required: true },
  { key: 'buyerBizNo', label: '공급받는자 사업자번호', aliases: ['공급받는자사업자등록번호', '공급받는자등록번호'], kind: 'bizNo', required: true },
  { key: 'buyerName', label: '공급받는자 상호', aliases: ['공급받는자상호', '상호(공급받는자)'], kind: 'text', required: true },
  { key: 'supplyAmount', label: '공급가액', aliases: ['공급가액'], kind: 'amount', required: true },
  { key: 'taxAmount', label: '세액', aliases: ['세액'], kind: 'amount', required: true },
  { key: 'totalAmount', label: '합계금액 (없으면 공급가액+세액)', aliases: ['합계금액'], kind: 'amount', required: false },
]

export const FIELDS_BY_KIND: Record<SourceKind, readonly FieldSpec[]> = {
  bank: BANK_FIELDS,
  invoice: INVOICE_FIELDS,
}

// 필수 열이 모두 매핑되었는지 (통장은 입금·출금·거래금액 중 하나 이상 필요)
export const isMappingComplete = (kind: SourceKind, mapping: ColumnMapping): boolean => {
  const requiredOk = FIELDS_BY_KIND[kind].every(field => !field.required || mapping[field.key] !== undefined)
  if (kind === 'invoice') return requiredOk
  return requiredOk && ['withdrawal', 'deposit', 'amount'].some(key => mapping[key] !== undefined)
}

type Converted<T> = { rows: T[], skipped: number[] } // skipped: 변환하지 못한 원본 행 번호

const asNumber = (value: FieldValue): number | null => (typeof value === 'number' ? value : null)
const asText = (value: FieldValue): string | null => (typeof value === 'string' && value !== '' ? value : null)
const asDate = (value: FieldValue): Date | null => (value instanceof Date ? value : null)

// 입금/출금 열 → 없으면 거래금액 + 구분(또는 부호)으로 방향과 금액을 정한다
const resolveBankAmount = (record: ParsedRecord<BankFieldKey>): { direction: 'IN' | 'OUT', amount: number } | null => {
  const withdrawal = asNumber(record.withdrawal)
  const deposit = asNumber(record.deposit)
  if (withdrawal) return { direction: 'OUT', amount: Math.abs(withdrawal) }
  if (deposit) return { direction: 'IN', amount: Math.abs(deposit) }

  const amount = asNumber(record.amount)
  if (!amount) return null
  const label = asText(record.direction) ?? ''
  if (/출|지급/.test(label)) return { direction: 'OUT', amount: Math.abs(amount) }
  if (/입/.test(label)) return { direction: 'IN', amount: Math.abs(amount) }
  return { direction: amount < 0 ? 'OUT' : 'IN', amount: Math.abs(amount) }
}

export const toBankTransactions = (records: readonly ParsedRecord<BankFieldKey>[]): Converted<BankTransaction> => {
  const rows: BankTransaction[] = []
  const skipped: number[] = []
  for (const record of records) {
    const date = asDate(record.date)
    const description = asText(record.description)
    const resolved = resolveBankAmount(record)
    if (!date || !description || !resolved) {
      skipped.push(record.rowIndex)
      continue
    }
    rows.push({
      id: `bank-${record.rowIndex}`,
      rowIndex: record.rowIndex,
      date,
      description,
      direction: resolved.direction,
      amount: resolved.amount,
      balance: asNumber(record.balance),
      memo: asText(record.memo),
    })
  }
  return { rows, skipped }
}

export const toTaxInvoices = (records: readonly ParsedRecord<InvoiceFieldKey>[]): Converted<TaxInvoice> => {
  const rows: TaxInvoice[] = []
  const skipped: number[] = []
  for (const record of records) {
    const issueDate = asDate(record.issueDate)
    const supplierBizNo = asText(record.supplierBizNo)
    const buyerBizNo = asText(record.buyerBizNo)
    const supplierName = asText(record.supplierName)
    const buyerName = asText(record.buyerName)
    const supplyAmount = asNumber(record.supplyAmount)
    const taxAmount = asNumber(record.taxAmount)
    if (!issueDate || !supplierBizNo || !buyerBizNo || !supplierName || !buyerName || supplyAmount === null || taxAmount === null) {
      skipped.push(record.rowIndex)
      continue
    }
    rows.push({
      id: `invoice-${record.rowIndex}`,
      rowIndex: record.rowIndex,
      issueDate,
      approvalNo: asText(record.approvalNo),
      supplierBizNo,
      supplierName,
      buyerBizNo,
      buyerName,
      supplyAmount,
      taxAmount,
      totalAmount: asNumber(record.totalAmount) ?? supplyAmount + taxAmount,
      kind: null,
    })
  }
  return { rows, skipped }
}
