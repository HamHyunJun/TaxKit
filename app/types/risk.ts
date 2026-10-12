import type { CardApproval } from '~/types/card'
import type { HelpEntry } from '~/types/help'

export type RiskTag = 'LATE_NIGHT' | 'WEEKEND' | 'HOLIDAY' | 'PRIVATE_MERCHANT' | 'SPLIT_PAYMENT' | 'ROUND_AMOUNT'
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'
// 화면에 표시하는 위험도: 리스크 점수 3점 이상이면 HIGH, 그 미만이면 MEDIUM
export type RiskLevel = 'HIGH' | 'MEDIUM'
export type RiskSort = 'score' | 'date' | 'amount'

export type RiskHit = {
  tag: RiskTag
  severity: Severity
  reason: string // 예: "23:42 승인 (심야 기준 23:00~06:00)"
}

export type RiskFinding = {
  approval: CardApproval
  hits: RiskHit[]
  riskScore: number // 심각도 가중치 합 (상 3, 중 2, 하 1)
  level: RiskLevel
}

// 규칙이 건별 판정 외에 필요로 하는 사전 계산 결과
export type RiskContext = {
  splitReasons: ReadonlyMap<string, string> // 분할 결제로 의심되는 승인 id → 사유
}

export type RiskRule = {
  tag: RiskTag
  name: string
  help: HelpEntry // 정보 아이콘에 보여줄 설명 (하는 일 / 필요한 이유)
  severity: Severity
  defaultEnabled: boolean
  evaluate: (row: CardApproval, context: RiskContext) => RiskHit | null
}

export type RiskCounts = {
  total: number // 취소 상계 후 전체 승인 건수
  flagged: number // 소명 대상(리스크 태그가 1개 이상)
  high: number
  medium: number
  byTag: Record<RiskTag, number>
}
