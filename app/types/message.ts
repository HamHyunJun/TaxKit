export type MissingEvidenceRow = {
  partnerName: string
  partnerBizNo: string | null
  date: Date
  amount: number
  description: string | null
  contact: string | null
}

export type MessageChannel = 'kakao' | 'sms'

// 같은 거래처(사업자번호 우선, 없으면 상호 정규화 키)로 묶은 누락 건
export type PartnerGroup = {
  key: string
  name: string // 그룹에서 가장 많이 쓰인 표기
  bizNo: string | null
  rows: MissingEvidenceRow[] // 날짜 오름차순
  count: number
  total: number
  firstDate: Date
  lastDate: Date
}

export type MessageSettings = {
  channel: MessageChannel
  officeName: string
  manager: string
  dueDate: string // YYYY-MM-DD (input[type=date] 값)
  templates: Record<MessageChannel, string>
}
