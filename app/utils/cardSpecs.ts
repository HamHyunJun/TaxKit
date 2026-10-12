import type { CardApproval } from '~/types/card'
import type { ColumnMapping, FieldSpec, ParsedRecord } from '~/types/excel'
import { isHhmmssColumn, parseTimeOfDay } from './date.ts'
import { normalizeCompanyName } from './companyName.ts'
import { asDate, asNumber, asText } from './cells.ts'

export type CardFieldKey
  = | 'approvedAt' | 'approvedDate' | 'approvedTime' | 'cardNo' | 'cardHolder'
    | 'merchantName' | 'merchantCategory' | 'amount' | 'approvalNo' | 'cancelFlag'

// 컬럼 별칭 사전 (PRD 4.3 C). 승인일시가 없으면 승인일자 + 승인시간을 합친다
export const CARD_FIELDS: readonly FieldSpec<CardFieldKey>[] = [
  { key: 'approvedAt', label: '승인일시', aliases: ['승인일시', '이용일시'], kind: 'date', required: false },
  { key: 'approvedDate', label: '승인일자 (승인일시가 없을 때)', aliases: ['승인일자', '이용일자', '거래일자', '승인일', '이용일'], kind: 'date', required: false },
  { key: 'approvedTime', label: '승인시간 (승인일자와 함께)', aliases: ['승인시간', '이용시간', '거래시간', '승인시각'], kind: 'text', required: false },
  { key: 'cardNo', label: '카드번호', aliases: ['카드번호'], kind: 'text', required: true },
  { key: 'cardHolder', label: '사용자', aliases: ['사용자', '이용자', '카드소지자'], kind: 'text', required: false },
  { key: 'merchantName', label: '가맹점명', aliases: ['가맹점명', '이용가맹점', '가맹점'], kind: 'text', required: true },
  { key: 'merchantCategory', label: '업종', aliases: ['업종', '가맹점업종', '업종명'], kind: 'text', required: false },
  { key: 'amount', label: '승인금액', aliases: ['승인금액', '이용금액', '금액'], kind: 'amount', required: true },
  { key: 'approvalNo', label: '승인번호', aliases: ['승인번호'], kind: 'text', required: false },
  { key: 'cancelFlag', label: '취소 여부/승인 구분', aliases: ['취소여부', '승인구분', '거래구분'], kind: 'text', required: false },
]

// 필수 열이 모두 있고, 승인일시 또는 승인일자 중 하나는 매핑되어야 한다
export const isCardMappingComplete = (mapping: ColumnMapping): boolean =>
  CARD_FIELDS.every(field => !field.required || mapping[field.key] !== undefined)
  && (mapping['approvedAt'] !== undefined || mapping['approvedDate'] !== undefined)

const isMidnight = (date: Date): boolean => date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0

// 날짜 부분만 쓰고 시각은 초 단위 값으로 덮어쓴다
const withTimeOfDay = (date: Date, seconds: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60)

export const toCardApprovals = (records: readonly ParsedRecord<CardFieldKey>[]): { rows: CardApproval[], skipped: number[] } => {
  const rows: CardApproval[] = []
  const skipped: number[] = []
  const unreadableTime = new Set<string>() // 시각 열에 값은 있는데 읽지 못한 행
  const digitsAreHhmmss = isHhmmssColumn(records.map(record => record.approvedTime))
  for (const record of records) {
    const base = asDate(record.approvedAt) ?? asDate(record.approvedDate)
    const seconds = parseTimeOfDay(record.approvedTime, digitsAreHhmmss)
    const cardNo = asText(record.cardNo)
    const merchantName = asText(record.merchantName)
    const rawAmount = asNumber(record.amount)
    if (!base || !cardNo || !merchantName || !rawAmount) {
      skipped.push(record.rowIndex)
      continue
    }
    const approvedAt = seconds === null ? base : withTimeOfDay(base, seconds)
    if (seconds === null && record.approvedTime !== null) unreadableTime.add(`card-${record.rowIndex}`)
    rows.push({
      id: `card-${record.rowIndex}`,
      rowIndex: record.rowIndex,
      approvedAt,
      hasTime: seconds !== null || !isMidnight(approvedAt),
      cardNo,
      cardHolder: asText(record.cardHolder),
      merchantName,
      merchantCategory: asText(record.merchantCategory),
      amount: Math.abs(rawAmount),
      approvalNo: asText(record.approvalNo),
      isCanceled: rawAmount < 0 || /취소|^(y|yes|true|1)$/i.test(asText(record.cancelFlag) ?? ''),
    })
  }
  // 파일에 시각이 한 건이라도 있으면 시각이 있는 파일로 본다 (자정 승인이 시각 없음으로 오인되지 않게).
  // 단, 시각을 읽지 못한 행은 00:00으로 둔갑시키지 않고 "시각 없음"으로 두어 심야·연속 승인 규칙을 건너뛴다
  const fileHasTime = rows.some(row => row.hasTime)
  return { rows: rows.map(row => ({ ...row, hasTime: fileHasTime && !unreadableTime.has(row.id) })), skipped }
}

// 취소 건을 같은 카드·가맹점·금액의 이전 승인과 짝지어 둘 다 제외한다 (승인번호가 둘 다 있으면 같아야 한다)
export const offsetCancellations = (rows: readonly CardApproval[]): { active: CardApproval[], offsetCount: number, unmatchedCancels: number } => {
  const keyOf = (row: CardApproval): string => `${row.cardNo}|${normalizeCompanyName(row.merchantName)}|${row.amount}`
  const byTime = (a: CardApproval, b: CardApproval): number => a.approvedAt.getTime() - b.approvedAt.getTime() || a.rowIndex - b.rowIndex

  const originals = new Map<string, CardApproval[]>()
  for (const row of [...rows].filter(item => !item.isCanceled).sort(byTime)) {
    const list = originals.get(keyOf(row))
    if (list) list.push(row)
    else originals.set(keyOf(row), [row])
  }

  const offsetIds = new Set<string>()
  let offsetCount = 0
  let unmatchedCancels = 0
  for (const cancel of [...rows].filter(item => item.isCanceled).sort(byTime)) {
    const original = (originals.get(keyOf(cancel)) ?? []).find(candidate =>
      !offsetIds.has(candidate.id)
      && candidate.approvedAt.getTime() <= cancel.approvedAt.getTime()
      && (candidate.approvalNo === null || cancel.approvalNo === null || candidate.approvalNo === cancel.approvalNo))
    if (original) {
      offsetIds.add(original.id)
      offsetCount += 1
    }
    else unmatchedCancels += 1
  }
  return { active: rows.filter(row => !row.isCanceled && !offsetIds.has(row.id)), offsetCount, unmatchedCancels }
}
