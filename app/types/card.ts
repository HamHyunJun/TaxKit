export type CardApproval = {
  id: string
  rowIndex: number // 원본 엑셀 기준 1-based 행 번호
  approvedAt: Date
  hasTime: boolean // 파일에 승인 시각이 있는지 (없으면 심야·연속 승인 규칙은 건너뛴다)
  cardNo: string // 마스킹된 그대로 사용
  cardHolder: string | null
  merchantName: string
  merchantCategory: string | null
  amount: number // 항상 양수 (취소는 isCanceled로 구분)
  approvalNo: string | null
  isCanceled: boolean
}
