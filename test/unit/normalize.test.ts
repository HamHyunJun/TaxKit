import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAmount } from '../../app/utils/amount.ts'
import { formatBizNo, normalizeBizNo } from '../../app/utils/bizNo.ts'
import { smsByteLength, smsKind } from '../../app/utils/byteLength.ts'
import { normalizeCompanyName } from '../../app/utils/companyName.ts'
import { parseDate, parseTimeOfDay } from '../../app/utils/date.ts'
import { nameSimilarity } from '../../app/utils/similarity.ts'

const clock = (seconds: number | null): string | null =>
  seconds === null
    ? null
    : [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':')

test('금액: 쉼표·원·괄호·△는 음수와 정수로 해석한다', () => {
  assert.equal(parseAmount('1,234원'), 1234)
  assert.equal(parseAmount('(1,000)'), -1000)
  assert.equal(parseAmount('-1,000'), -1000)
  assert.equal(parseAmount('△1,000'), -1000)
  assert.equal(parseAmount('1,000.6'), 1001)
  assert.equal(parseAmount(-0.4), 0) // -0이 아니라 0
  assert.equal(parseAmount('abc'), null)
  assert.equal(parseAmount(''), null)
})

test('날짜: 시리얼·문자열·8자리 숫자를 읽고 없는 날짜는 거부한다', () => {
  const ymd = (date: Date | null): string | null => (date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null)
  assert.equal(ymd(parseDate('2026-09-03')), '2026-9-3')
  assert.equal(ymd(parseDate('2026.09.03')), '2026-9-3')
  assert.equal(ymd(parseDate('20260903')), '2026-9-3')
  assert.equal(ymd(parseDate(20260903)), '2026-9-3')
  assert.equal(ymd(parseDate(46268)), '2026-9-3') // 엑셀 시리얼
  assert.equal(parseDate('2026-02-31'), null)
  assert.equal(parseDate('hello'), null)
})

test('시각: 숫자 HHMMSS는 엑셀이 앞의 0을 지운 값도 읽는다 (아침 결제가 00:00으로 둔갑하던 버그)', () => {
  assert.equal(clock(parseTimeOfDay('23:42')), '23:42:00')
  assert.equal(clock(parseTimeOfDay('23:42:10')), '23:42:10')
  assert.equal(clock(parseTimeOfDay(235530)), '23:55:30')
  assert.equal(clock(parseTimeOfDay(90510)), '09:05:10') // 090510
  assert.equal(clock(parseTimeOfDay(21508)), '02:15:08') // 021508
  assert.equal(clock(parseTimeOfDay(3015)), '00:30:15') // 003015: 4자리인데 시가 24 이상이면 HHMMSS로 본다
  assert.equal(clock(parseTimeOfDay('1430')), '14:30:00') // 4자리는 HHMM 우선
  assert.equal(clock(parseTimeOfDay('930')), '09:30:00')
  assert.equal(clock(parseTimeOfDay('090510')), '09:05:10')
  assert.equal(clock(parseTimeOfDay(0.5)), '12:00:00') // 엑셀 시간
  assert.equal(parseTimeOfDay('25:00'), null)
  assert.equal(parseTimeOfDay('2575'), null)
  assert.equal(parseTimeOfDay('abc'), null)
})

test('사업자번호·상호 정규화', () => {
  assert.equal(normalizeBizNo('123-45-67890'), '1234567890')
  assert.equal(normalizeBizNo('123-45'), null)
  assert.equal(formatBizNo('1234567890'), '123-45-67890')
  assert.equal(normalizeCompanyName('㈜ 한빛-상사'), '한빛상사')
  assert.equal(normalizeCompanyName('주식회사 ABC (유)'), 'abc')
})

test('상호 유사도: 포함 관계는 1, 다른 회사는 낮다', () => {
  assert.equal(nameSimilarity('한빛상사', '한빛상사9월'), 1)
  assert.ok(nameSimilarity('대성물산', '대성산업') >= 0.5)
  assert.ok(nameSimilarity('한빛상사', '전혀다른곳') < 0.4)
  assert.equal(nameSimilarity('', '한빛'), 0)
})

test('문자 byte: 한글은 2byte, 90byte까지 SMS', () => {
  assert.equal(smsByteLength('abc가나'), 7)
  assert.equal(smsKind(90), 'SMS')
  assert.equal(smsKind(91), 'LMS')
  assert.equal(smsKind(2001), 'OVER')
})
