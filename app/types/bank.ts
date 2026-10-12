export type BankDirection = 'IN' | 'OUT'

export type BankTransaction = {
  id: string
  rowIndex: number // 원본 엑셀 기준 1-based 행 번호
  date: Date
  description: string
  direction: BankDirection
  amount: number // 항상 양수 (입출금은 direction으로 구분)
  balance: number | null
  memo: string | null
}
