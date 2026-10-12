import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useColumnMapping } from '../../app/composables/useColumnMapping.ts'
import { useExcelReader } from '../../app/composables/useExcelReader.ts'
import { useSheetSource } from '../../app/composables/useSheetSource.ts'
import { useRiskScanner } from '../../app/composables/useRiskScanner.ts'
import { CARD_FIELDS, isCardMappingComplete, offsetCancellations, toCardApprovals } from '../../app/utils/cardSpecs.ts'
import { isInHolidayTable } from '../../app/utils/holidays.ts'
import { DEFAULT_ENABLED_TAGS, countFindings, scanApprovals, sortFindings } from '../../app/utils/riskRules.ts'

// composable은 Nuxt 자동 import에 기대므로, node에서는 같은 이름을 전역에 직접 걸어 준다
const memory = new Map<string, string>()
Object.assign(globalThis, {
  ref, shallowRef, computed, watch,
  useExcelReader, useColumnMapping, useSheetSource,
  CARD_FIELDS, isCardMappingComplete, toCardApprovals, offsetCancellations,
  DEFAULT_ENABLED_TAGS, scanApprovals, countFindings, sortFindings, isInHolidayTable,
  localStorage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value) },
})

const BYTES = readFileSync(new URL('../fixtures/tab2-카드스캐너/2-1_법인카드승인내역_2026-09.xlsx', import.meta.url))
const card = (name = 'card.xlsx'): File => new File([BYTES], name)

test('컬럼 다시 지정: 같은 파일을 다시 지정해도 입력한 소명이 남고, 다른 파일을 열면 비워진다', async () => {
  const scanner = useRiskScanner()
  await scanner.loadFile(card())
  await nextTick()
  assert.ok(scanner.shown.value.length > 0)

  scanner.explanations.value = { 'card-1': '거래처 접대' }
  scanner.reopenMapping()
  assert.ok(scanner.pending.value, '다시 지정 모달이 열린다')
  scanner.confirmMapping(scanner.pending.value.mapping)
  await nextTick()
  assert.deepEqual(scanner.explanations.value, { 'card-1': '거래처 접대' })

  await scanner.loadFile(card('other.xlsx'))
  await nextTick()
  assert.deepEqual(scanner.explanations.value, {})
})

test('컬럼 다시 지정: 필수 열을 비운 채 확인해도 이미 불러온 데이터는 지워지지 않고 안내만 뜬다', async () => {
  const source = useSheetSource({
    specs: CARD_FIELDS,
    isComplete: isCardMappingComplete,
    incompleteMessage: '필수 열을 지정해 주세요',
    emptyMessage: '행이 없어요',
    toRows: toCardApprovals,
  })
  await source.loadFile(card())
  const loaded = source.state.value.rows.length
  assert.ok(loaded > 0)

  source.reopenMapping()
  source.confirmMapping({})
  assert.equal(source.state.value.rows.length, loaded)
  assert.equal(source.state.value.fileName, 'card.xlsx')
  assert.equal(source.state.value.error, '필수 열을 지정해 주세요')
})
