import type { CardApproval } from '~/types/card'
import type { RiskContext, RiskCounts, RiskFinding, RiskHit, RiskLevel, RiskRule, RiskSort, RiskTag, Severity } from '~/types/risk'

const LATE_NIGHT_START_HOUR = 23
const LATE_NIGHT_END_HOUR = 6 // 06:00 이전까지 (05:59 포함)
const SPLIT_WINDOW_MS = 60 * 60 * 1000
const SPLIT_LIMIT = 500_000 // 건별 한도 (같은 날 합계가 이를 넘는데 건별로는 못 미치면 분할 의심)
const ROUND_MIN_AMOUNT = 100_000
const ROUND_UNIT = 10_000
const HIGH_LEVEL_SCORE = 3

const SEVERITY_WEIGHT: Record<Severity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

// 사적 사용 의심 업종 키워드 (PRD 5.2 + 뷰티). 가맹점명·업종에서 찾는다
const PRIVATE_KEYWORDS: readonly string[] = [
  '골프', '컨트리클럽', 'CC', '스크린골프', '백화점', '면세점', '병원', '의원', '치과', '피부과', '성형', '한의원', '약국',
  '유흥주점', '단란주점', '노래', '룸', '마사지', '스파', '사우나', '상품권', '귀금속', '명품', '뷰티',
]

// 영문 키워드(CC)는 다른 단어의 일부(ACCESS 등)와 섞이지 않도록 단어 경계에서만 일치시킨다
const PRIVATE_MATCHERS: readonly { keyword: string, test: (text: string) => boolean }[] = PRIVATE_KEYWORDS.map((keyword) => {
  if (!/^[\x20-\x7E]+$/.test(keyword)) return { keyword, test: (text: string): boolean => text.includes(keyword) }
  const pattern = new RegExp(`(^|[^a-z0-9])${keyword}($|[^a-z0-9])`, 'i')
  return { keyword, test: (text: string): boolean => pattern.test(text) }
})

const merchantKey = (row: CardApproval): string => `${row.cardNo}|${normalizeCompanyName(row.merchantName)}`

// 같은 카드·같은 가맹점의 승인을 모아 분할 결제 의심 건과 사유를 만든다
const detectSplitPayments = (rows: readonly CardApproval[]): Map<string, string> => {
  const reasons = new Map<string, string>()
  const groups = new Map<string, CardApproval[]>()
  for (const row of rows) {
    const group = groups.get(merchantKey(row))
    if (group) group.push(row)
    else groups.set(merchantKey(row), [row])
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue
    group.sort((a, b) => a.approvedAt.getTime() - b.approvedAt.getTime() || a.rowIndex - b.rowIndex)

    // 1) 직전 승인과 60분 이내로 이어지는 연속 승인 묶음 (시각이 있는 파일만)
    if (group.every(row => row.hasTime)) {
      let chain: CardApproval[] = []
      const flush = (): void => {
        if (chain.length >= 2) {
          const total = chain.reduce((sum, row) => sum + row.amount, 0)
          for (const row of chain) reasons.set(row.id, `같은 가맹점에서 60분 이내 ${chain.length}건 연속 승인 (합계 ${formatWon(total)}원)`)
        }
        chain = []
      }
      for (const row of group) {
        const last = chain[chain.length - 1]
        if (last && row.approvedAt.getTime() - last.approvedAt.getTime() <= SPLIT_WINDOW_MS) chain.push(row)
        else {
          flush()
          chain = [row]
        }
      }
      flush()
    }

    // 2) 같은 날 합계는 한도를 넘는데 건별로는 모두 한도 미만
    const days = new Map<number, CardApproval[]>()
    for (const row of group) {
      const day = days.get(toDayNumber(row.approvedAt))
      if (day) day.push(row)
      else days.set(toDayNumber(row.approvedAt), [row])
    }
    for (const day of days.values()) {
      const total = day.reduce((sum, row) => sum + row.amount, 0)
      if (day.length < 2 || total <= SPLIT_LIMIT || day.some(row => row.amount >= SPLIT_LIMIT)) continue
      for (const row of day) {
        if (!reasons.has(row.id)) reasons.set(row.id, `같은 날 같은 가맹점 ${day.length}건 합계 ${formatWon(total)}원 (건당 ${formatWon(SPLIT_LIMIT)}원 미만)`)
      }
    }
  }
  return reasons
}

const hit = (tag: RiskTag, severity: Severity, reason: string): RiskHit => ({ tag, severity, reason })

// 규칙은 순수 함수 배열이다. 새 규칙은 여기에 추가하고, 켜고 끄기는 호출하는 쪽의 enabledTags로 한다
export const RISK_RULES: readonly RiskRule[] = [
  {
    tag: 'LATE_NIGHT',
    name: '심야 사용',
    description: '23:00 ~ 06:00 승인',
    severity: 'MEDIUM',
    defaultEnabled: true,
    evaluate: (row) => {
      if (!row.hasTime) return null
      const hour = row.approvedAt.getHours()
      return hour >= LATE_NIGHT_START_HOUR || hour < LATE_NIGHT_END_HOUR
        ? hit('LATE_NIGHT', 'MEDIUM', `${formatTime(row.approvedAt)} 승인 (심야 기준 23:00~06:00)`)
        : null
    },
  },
  {
    tag: 'WEEKEND',
    name: '주말 사용',
    description: '토·일요일 승인',
    severity: 'LOW',
    defaultEnabled: true,
    evaluate: (row) => {
      const day = row.approvedAt.getDay()
      return day === 0 || day === 6 ? hit('WEEKEND', 'LOW', `${formatDate(row.approvedAt)} ${day === 0 ? '일' : '토'}요일 승인`) : null
    },
  },
  {
    tag: 'HOLIDAY',
    name: '공휴일 사용',
    description: '법정·대체공휴일 승인 (2025~2027)',
    severity: 'MEDIUM',
    defaultEnabled: true,
    evaluate: (row) => {
      const holiday = getHolidayName(row.approvedAt)
      return holiday ? hit('HOLIDAY', 'MEDIUM', `공휴일 승인 (${holiday})`) : null
    },
  },
  {
    tag: 'PRIVATE_MERCHANT',
    name: '사적 의심 업종',
    description: '골프·백화점·병원·뷰티 등 키워드',
    severity: 'HIGH',
    defaultEnabled: true,
    evaluate: (row) => {
      const inName = PRIVATE_MATCHERS.find(matcher => matcher.test(row.merchantName))
      if (inName) return hit('PRIVATE_MERCHANT', 'HIGH', `가맹점명에 '${inName.keyword}' 포함`)
      const inCategory = row.merchantCategory ? PRIVATE_MATCHERS.find(matcher => matcher.test(row.merchantCategory ?? '')) : undefined
      return inCategory ? hit('PRIVATE_MERCHANT', 'HIGH', `업종에 '${inCategory.keyword}' 포함`) : null
    },
  },
  {
    tag: 'SPLIT_PAYMENT',
    name: '연속 분할 결제',
    description: '같은 가맹점 60분 이내 연속 승인 등',
    severity: 'HIGH',
    defaultEnabled: true,
    evaluate: (row, context) => {
      const reason = context.splitReasons.get(row.id)
      return reason ? hit('SPLIT_PAYMENT', 'HIGH', reason) : null
    },
  },
  {
    tag: 'ROUND_AMOUNT',
    name: '딱 떨어지는 고액',
    description: '10만 원 이상, 1만 원 단위',
    severity: 'LOW',
    defaultEnabled: false,
    evaluate: row =>
      row.amount >= ROUND_MIN_AMOUNT && row.amount % ROUND_UNIT === 0
        ? hit('ROUND_AMOUNT', 'LOW', `${formatWon(row.amount)}원 (1만 원 단위로 떨어지는 고액)`)
        : null,
  },
]

export const DEFAULT_ENABLED_TAGS: readonly RiskTag[] = RISK_RULES.filter(rule => rule.defaultEnabled).map(rule => rule.tag)

const levelOf = (score: number): RiskLevel => (score >= HIGH_LEVEL_SCORE ? 'HIGH' : 'MEDIUM')

// 켜진 규칙을 모든 승인 건에 적용해 소명 대상(태그가 1개 이상인 건)만 돌려준다
export const scanApprovals = (approvals: readonly CardApproval[], enabledTags: ReadonlySet<RiskTag>): RiskFinding[] => {
  const rules = RISK_RULES.filter(rule => enabledTags.has(rule.tag))
  const context: RiskContext = { splitReasons: enabledTags.has('SPLIT_PAYMENT') ? detectSplitPayments(approvals) : new Map() }
  const findings: RiskFinding[] = []
  for (const approval of approvals) {
    const hits = rules.flatMap((rule): RiskHit[] => {
      const found = rule.evaluate(approval, context)
      return found ? [found] : []
    })
    if (hits.length === 0) continue
    const riskScore = hits.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0)
    findings.push({ approval, hits, riskScore, level: levelOf(riskScore) })
  }
  return findings
}

export const countFindings = (total: number, findings: readonly RiskFinding[]): RiskCounts => {
  const byTag: Record<RiskTag, number> = { LATE_NIGHT: 0, WEEKEND: 0, HOLIDAY: 0, PRIVATE_MERCHANT: 0, SPLIT_PAYMENT: 0, ROUND_AMOUNT: 0 }
  let high = 0
  for (const finding of findings) {
    if (finding.level === 'HIGH') high += 1
    for (const item of finding.hits) byTag[item.tag] += 1
  }
  return { total, flagged: findings.length, high, medium: findings.length - high, byTag }
}

// 정렬: 리스크 점수↓(기본, 동점은 승인일시↑) / 승인일시↑ / 금액↓
export const sortFindings = (findings: readonly RiskFinding[], sort: RiskSort): RiskFinding[] => {
  const byDate = (a: RiskFinding, b: RiskFinding): number =>
    a.approval.approvedAt.getTime() - b.approval.approvedAt.getTime() || a.approval.rowIndex - b.approval.rowIndex
  const comparators: Record<RiskSort, (a: RiskFinding, b: RiskFinding) => number> = {
    score: (a, b) => b.riskScore - a.riskScore || byDate(a, b),
    date: byDate,
    amount: (a, b) => b.approval.amount - a.approval.amount || byDate(a, b),
  }
  return [...findings].sort(comparators[sort])
}

export const tagName = (tag: RiskTag): string => RISK_RULES.find(rule => rule.tag === tag)?.name ?? tag
