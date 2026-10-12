import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSheet } from '../../app/composables/useExcelWriter.ts'

test('엑셀 쓰기: 15만 행 시트도 열 너비를 계산한다 (Math.max 펼침으로 스택이 넘치던 버그)', () => {
  const rows = Array.from({ length: 150_000 }, (_, i) => [new Date(2026, 8, 1 + (i % 28)), i, i % 7 === 0 ? '가나다라마바사' : 'ab'])
  const sheet = buildSheet({ name: '큰시트', header: ['일자', '번호', '이름'], rows })
  assert.equal(sheet['!cols']?.length, 3)
  assert.equal(sheet['!cols']?.[2]?.wch, 16) // 한글 7자 = 14 + 여백 2
  assert.equal(sheet['A2']?.z, 'yyyy-mm-dd') // 날짜는 서식이 붙은 숫자 셀
})

test('엑셀 쓰기: 수식처럼 보이는 문자열은 수식이 아니라 문자열로 기록한다', () => {
  const sheet = buildSheet({ name: '시트', header: ['값'], rows: [['=1+1'], ['+SUM(A1)']] })
  assert.equal(sheet['A2']?.t, 's')
  assert.equal(sheet['A2']?.v, '=1+1')
  assert.equal(sheet['A3']?.t, 's')
})
