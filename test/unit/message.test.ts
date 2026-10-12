import assert from 'node:assert/strict'
import test from 'node:test'
import type { MessageSettings, MissingEvidenceRow } from '../../app/types/message.ts'
import { groupByPartner, matchesPartner } from '../../app/utils/messageGroups.ts'
import { isMessageMappingComplete, toMissingRows, withPartnerFallback } from '../../app/utils/messageSpecs.ts'
import { DEFAULT_TEMPLATES, defaultDueDate, joinMessages, renderMessage } from '../../app/utils/messageTemplate.ts'

const row = (name: string, bizNo: string | null, day: number, amount: number, description: string | null = null): MissingEvidenceRow =>
  ({ partnerName: name, partnerBizNo: bizNo, date: new Date(2026, 8, day), amount, description, contact: null })
const settings: MessageSettings = { channel: 'kakao', officeName: '', manager: '김OO', dueDate: '2026-10-20', templates: DEFAULT_TEMPLATES }

test('그룹화: 사업자번호가 있으면 상호 표기가 달라도, 없으면 상호 정규화 키로 묶는다', () => {
  const groups = groupByPartner([
    row('(주)한빛상사', '1234567890', 9, 500_000, '9월 물품대'), row('한빛상사', '1234567890', 3, 1_100_000),
    row('대성물산', null, 5, 550_000), row('(주) 대성물산', null, 20, 100_000), row('새한유통', null, 7, 330_000),
  ])
  assert.equal(groups.length, 3)
  assert.equal(groups[0]?.total, 1_600_000) // 합계 큰 순
  assert.deepEqual(groups[0]?.rows.map(r => r.date.getDate()), [3, 9]) // 날짜 오름차순
  assert.equal(groups.find(g => g.name.includes('대성'))?.count, 2)
  assert.ok(groups[0] && matchesPartner(groups[0], '한빛') && matchesPartner(groups[0], '123-45') && !matchesPartner(groups[0], '없는곳'))
})

test('문구: 변수 치환, 기간, 10건 초과 시 "외 n건", 빈 설정은 예시 문구', () => {
  const [group] = groupByPartner([row('한빛상사', '1234567890', 3, 1_100_000), row('한빛상사', '1234567890', 9, 500_000, '9월 물품대')])
  assert.ok(group)
  const text = renderMessage(DEFAULT_TEMPLATES.kakao, group, settings)
  assert.match(text, /○○세무회계 김OO입니다/)
  assert.match(text, /2026\.09\.03~2026\.09\.09 거래/)
  assert.match(text, /1,600,000원/)
  assert.match(text, /- 2026\.09\.03 {2}1,100,000원\n- 2026\.09\.09 {2}500,000원 {2}\(9월 물품대\)/)
  assert.match(text, /2026\.10\.20까지/)
  assert.equal(renderMessage('{모르는변수} {건수}', group, settings), '{모르는변수} 2') // 모르는 변수는 그대로
  assert.equal(renderMessage('{회신기한}', group, { ...settings, dueDate: '' }), '○월 ○일')

  const [many] = groupByPartner(Array.from({ length: 13 }, (_, i) => row('많은곳', '9999999999', 1 + i, 1_000)))
  assert.ok(many)
  const list = renderMessage('{목록}', many, settings)
  assert.equal(list.split('\n').length, 11)
  assert.ok(list.endsWith('외 3건'))
  assert.match(defaultDueDate(7), /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(joinMessages(['a', 'b']).includes('──────────'))
})

test('누락 건 엑셀 변환: 거래처 열이 없으면 적요를 거래처명으로 쓴다', () => {
  const converted = toMissingRows([
    { partnerName: '가', partnerBizNo: null, date: new Date(2026, 8, 1), amount: 10, description: null, contact: null, rowIndex: 2 },
    { partnerName: null, partnerBizNo: null, date: new Date(2026, 8, 1), amount: 10, description: null, contact: null, rowIndex: 3 },
  ])
  assert.equal(converted.rows.length, 1)
  assert.deepEqual(converted.skipped, [3])
  assert.deepEqual(withPartnerFallback({ description: 3, date: 0, amount: 1 }), { description: 3, date: 0, amount: 1, partnerName: 3 })
  assert.equal(isMessageMappingComplete(withPartnerFallback({ description: 3, date: 0, amount: 1 })), true)
  assert.equal(isMessageMappingComplete({ date: 0, amount: 1 }), false)
})
