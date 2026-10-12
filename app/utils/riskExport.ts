import type { SheetData } from '~/composables/useExcelWriter'
import type { RiskCounts, RiskFinding, RiskTag } from '~/types/risk'

export type RiskReportMeta = {
  fileName: string
  enabledTags: readonly RiskTag[]
  offsetCount: number // 상계된 취소 건수
}

const LEVEL_LABELS = { HIGH: 'High', MEDIUM: 'Medium' } as const

export const levelLabel = (level: keyof typeof LEVEL_LABELS): string => LEVEL_LABELS[level]

// 소명 리포트: 요약 시트 + 소명 대상 시트 (소명 내용은 사용자가 입력한 값, 없으면 빈칸)
export const buildRiskSheets = (
  findings: readonly RiskFinding[],
  counts: RiskCounts,
  explanations: Readonly<Record<string, string>>,
  meta: RiskReportMeta,
): SheetData[] => [
  {
    name: '요약',
    header: ['항목', '값'],
    rows: [
      ['원본 파일', meta.fileName],
      ['전체 승인 건수(취소 상계 후)', counts.total],
      ['상계된 취소 건수', meta.offsetCount],
      ['소명 대상 전체', counts.flagged],
      ['High', counts.high],
      ['Medium', counts.medium],
      ['이 리포트에 담긴 건수', findings.length],
      ...(Object.keys(counts.byTag) as RiskTag[]).map((tag): SheetData['rows'][number] => [`태그 · ${tagName(tag)}`, counts.byTag[tag]]),
      ['사용한 규칙', meta.enabledTags.map(tagName).join(', ')],
    ],
  },
  {
    name: '소명대상',
    header: ['승인일시', '카드번호', '사용자', '가맹점', '업종', '금액', '위험도', '리스크 태그', '사유', '소명 내용'],
    rows: findings.map((finding): SheetData['rows'][number] => [
      finding.approval.approvedAt,
      finding.approval.cardNo,
      finding.approval.cardHolder,
      finding.approval.merchantName,
      finding.approval.merchantCategory,
      finding.approval.amount,
      levelLabel(finding.level),
      finding.hits.map(item => tagName(item.tag)).join(', '),
      finding.hits.map(item => item.reason).join('; '),
      explanations[finding.approval.id] ?? '',
    ]),
  },
]
