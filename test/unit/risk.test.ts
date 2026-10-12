import assert from 'node:assert/strict'
import test from 'node:test'
import type { CardApproval } from '../../app/types/card.ts'
import type { FieldValue, ParsedRecord } from '../../app/types/excel.ts'
import type { RiskTag } from '../../app/types/risk.ts'
import { type CardFieldKey, isCardMappingComplete, offsetCancellations, toCardApprovals } from '../../app/utils/cardSpecs.ts'
import { getHolidayName } from '../../app/utils/holidays.ts'
import { DEFAULT_ENABLED_TAGS, countFindings, scanApprovals, sortFindings } from '../../app/utils/riskRules.ts'

let seq = 0
const card = (y: number, mo: number, d: number, h: number, mi: number, merchant: string, amount: number, extra: Partial<CardApproval> = {}): CardApproval => {
  seq += 1
  return {
    id: `card-${seq}`, rowIndex: seq, approvedAt: new Date(y, mo - 1, d, h, mi), hasTime: true, cardNo: '1234-****', cardHolder: null,
    merchantName: merchant, merchantCategory: null, amount, approvalNo: null, isCanceled: false, ...extra,
  }
}
const enabled = new Set<RiskTag>(DEFAULT_ENABLED_TAGS)
const tagsOf = (rows: CardApproval[], id: string, tags: ReadonlySet<RiskTag> = enabled): string | undefined =>
  scanApprovals(rows, tags).find(f => f.approval.id === id)?.hits.map(h => h.tag).sort().join('+')

test('공휴일 표: 추석·대체공휴일이 맞고, 표 밖 날짜는 판정하지 못한다', () => {
  assert.equal(getHolidayName(new Date(2026, 8, 25)), '추석')
  assert.equal(getHolidayName(new Date(2026, 2, 2)), '대체공휴일(삼일절)')
  assert.equal(getHolidayName(new Date(2027, 1, 8)), '대체공휴일(설날)')
  assert.equal(getHolidayName(new Date(2026, 8, 14)), null)
  assert.equal(getHolidayName(new Date(2028, 0, 1)), null) // 표가 2025~2027뿐이다 (화면에서 경고한다)
})

test('위험 규칙: 심야·주말·공휴일·사적 업종·분할 결제', () => {
  seq = 0
  const rows = [
    card(2026, 9, 14, 12, 0, '맛있는식당', 30_000), // card-1 정상
    card(2026, 9, 14, 23, 0, '편의점', 5_000), // card-2 23:00 심야
    card(2026, 9, 15, 5, 59, '편의점B', 5_000), // card-3 05:59 심야
    card(2026, 9, 15, 6, 0, '편의점C', 5_000), // card-4 06:00 정상
    card(2026, 9, 19, 12, 0, '문구점', 12_000), // card-5 토요일
    card(2026, 9, 25, 12, 0, '문구점', 12_000), // card-6 추석
    card(2026, 9, 16, 12, 0, '○○컨트리클럽', 480_000), // card-7 사적
    card(2026, 9, 16, 13, 0, '서울ACCESS센터', 10_000), // card-8 영문 CC 오탐 방지
    card(2026, 9, 16, 14, 0, '강남 CC 식당', 10_000), // card-9 단어 CC
    card(2026, 9, 18, 10, 0, '주유소', 90_000), card(2026, 9, 18, 10, 30, '주유소', 90_000), card(2026, 9, 18, 11, 20, '주유소', 90_000), // card-10~12 60분 연속
    card(2026, 9, 21, 9, 0, '정육점', 300_000), card(2026, 9, 21, 16, 0, '정육점', 300_000), // card-13~14 같은 날 합계 60만
  ]
  assert.equal(tagsOf(rows, 'card-1'), undefined)
  assert.equal(tagsOf(rows, 'card-2'), 'LATE_NIGHT')
  assert.equal(tagsOf(rows, 'card-3'), 'LATE_NIGHT')
  assert.equal(tagsOf(rows, 'card-4'), undefined)
  assert.equal(tagsOf(rows, 'card-5'), 'WEEKEND')
  assert.equal(tagsOf(rows, 'card-6'), 'HOLIDAY')
  assert.equal(tagsOf(rows, 'card-7'), 'PRIVATE_MERCHANT')
  assert.equal(tagsOf(rows, 'card-8'), undefined)
  assert.equal(tagsOf(rows, 'card-9'), 'PRIVATE_MERCHANT')
  for (const id of ['card-10', 'card-11', 'card-12', 'card-13', 'card-14']) assert.equal(tagsOf(rows, id), 'SPLIT_PAYMENT', id)
})

test('위험도: 3점 이상은 High, 그 미만은 Medium. 고액 정액 규칙은 기본 꺼짐', () => {
  seq = 0
  const saturdayNight = scanApprovals([card(2026, 9, 19, 23, 30, '식당', 20_000)], enabled)[0]
  assert.deepEqual([saturdayNight?.riskScore, saturdayNight?.level], [3, 'HIGH'])
  const late = scanApprovals([card(2026, 9, 15, 23, 30, '식당', 20_000)], enabled)[0]
  assert.deepEqual([late?.riskScore, late?.level], [2, 'MEDIUM'])
  seq = 0
  const round = [card(2026, 9, 22, 9, 0, '상품권센터', 500_000)]
  assert.equal(tagsOf(round, 'card-1'), 'PRIVATE_MERCHANT')
  assert.equal(tagsOf(round, 'card-1', new Set<RiskTag>([...enabled, 'ROUND_AMOUNT'])), 'PRIVATE_MERCHANT+ROUND_AMOUNT')
})

test('시각이 없는 파일은 심야·60분 규칙을 건너뛰고 같은 날 합계 규칙만 적용한다', () => {
  seq = 0
  const noTime = [card(2026, 9, 21, 0, 0, '정육점', 300_000, { hasTime: false }), card(2026, 9, 21, 0, 0, '정육점', 300_000, { hasTime: false })]
  assert.deepEqual(scanApprovals(noTime, enabled).map(f => f.hits.map(h => h.tag).join()), ['SPLIT_PAYMENT', 'SPLIT_PAYMENT'])
  assert.equal(scanApprovals([card(2026, 9, 21, 0, 0, '식당', 1_000, { hasTime: false })], enabled).length, 0)
})

test('집계·정렬', () => {
  seq = 0
  const rows = [card(2026, 9, 19, 23, 30, '식당', 20_000), card(2026, 9, 15, 23, 30, '식당2', 90_000), card(2026, 9, 22, 9, 0, '상품권센터', 10_000)]
  const findings = scanApprovals(rows, enabled)
  const counts = countFindings(rows.length, findings)
  assert.equal(counts.flagged, 3)
  assert.equal(counts.high + counts.medium, counts.flagged)
  assert.equal(sortFindings(findings, 'amount')[0]?.approval.amount, 90_000)
  assert.equal(sortFindings(findings, 'score')[0]?.riskScore, Math.max(...findings.map(f => f.riskScore)))
})

test('취소 상계: 승인번호가 같으면 짝지어 제외하고, 다르면 상계하지 않는다', () => {
  seq = 0
  const original = card(2026, 9, 1, 10, 0, '백화점', 100_000, { approvalNo: 'A1' })
  const cancel = card(2026, 9, 2, 10, 0, '백화점', 100_000, { approvalNo: 'A1', isCanceled: true })
  const other = card(2026, 9, 3, 10, 0, '백화점', 100_000, { approvalNo: 'A2' })
  const lone = card(2026, 9, 4, 10, 0, '다른곳', 5_000, { isCanceled: true })
  const result = offsetCancellations([original, cancel, other, lone])
  assert.deepEqual(result.active.map(r => r.id), [other.id])
  assert.equal(result.offsetCount, 1)
  assert.equal(result.unmatchedCancels, 1)
  assert.equal(offsetCancellations([other, { ...cancel, approvalNo: 'ZZ', approvedAt: new Date(2026, 8, 5) }]).offsetCount, 0)
})

const record = (rowIndex: number, over: Partial<Record<CardFieldKey, FieldValue>>): ParsedRecord<CardFieldKey> => ({
  approvedAt: null, approvedDate: new Date(2026, 8, 15), approvedTime: null, cardNo: '1111', cardHolder: null,
  merchantName: '식당', merchantCategory: null, amount: 1_000, approvalNo: null, cancelFlag: null, rowIndex, ...over,
})

test('카드 변환: 승인시간이 숫자 HHMMSS여도 아침 결제가 심야로 오인되지 않는다 (회귀)', () => {
  const converted = toCardApprovals([
    record(2, { approvedTime: '142000', merchantName: '점심식당' }),
    record(3, { approvedTime: '90510', merchantName: '아침커피' }), // 09:05:10
    record(4, { approvedTime: '84500', merchantName: '아침식당' }), // 08:45:00
    record(5, { approvedTime: '183000', merchantName: '저녁식당' }),
  ])
  assert.deepEqual(converted.rows.map(r => r.approvedAt.getHours()), [14, 9, 8, 18])
  assert.equal(scanApprovals(converted.rows, enabled).length, 0) // 평일 낮·아침이라 소명 대상 없음
})

test('카드 변환: 시각을 읽지 못한 행은 00:00이 아니라 시각 없음으로 두어 심야 규칙을 건너뛴다', () => {
  const converted = toCardApprovals([record(2, { approvedTime: '142000' }), record(3, { approvedTime: '시간미상', merchantName: '미상식당' })])
  assert.equal(converted.rows[0]?.hasTime, true)
  assert.equal(converted.rows[1]?.hasTime, false)
  assert.equal(scanApprovals(converted.rows, enabled).length, 0)
})

test('카드 변환: 승인일자+승인시간, 음수 금액·취소 표시는 취소, 필수 값 없는 행은 건너뜀', () => {
  const converted = toCardApprovals([
    record(2, { approvedTime: '23:41:05' }),
    record(3, { approvedTime: '0.5' }),
    record(4, { amount: -500 }),
    record(5, { cancelFlag: '승인취소' }),
    record(6, { cardNo: null }),
  ])
  assert.equal(converted.rows.length, 4)
  assert.deepEqual(converted.skipped, [6])
  assert.deepEqual(converted.rows.map(r => r.isCanceled), [false, false, true, true])
  assert.equal(isCardMappingComplete({ cardNo: 0, merchantName: 1, amount: 2 }), false)
  assert.equal(isCardMappingComplete({ cardNo: 0, merchantName: 1, amount: 2, approvedDate: 3 }), true)
})
