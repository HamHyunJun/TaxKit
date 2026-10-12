// SALES: 우리가 공급자(매출), PURCHASE: 우리가 공급받는자(매입)
export type InvoiceKind = 'SALES' | 'PURCHASE'

export type TaxInvoice = {
  id: string
  rowIndex: number
  issueDate: Date
  approvalNo: string | null
  supplierBizNo: string
  supplierName: string
  buyerBizNo: string
  buyerName: string
  supplyAmount: number
  taxAmount: number
  totalAmount: number
  kind: InvoiceKind | null // 우리 회사 사업자번호로 판별하지 못하면 null
}
