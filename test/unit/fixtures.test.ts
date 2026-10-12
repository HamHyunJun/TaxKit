import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { ColumnMapping, FieldSpec, HeaderDetection, ParseIssue, ParsedRecord, ParsedSheet, RawSheet } from '../../app/types/excel.ts'
import { useExcelReader } from '../../app/composables/useExcelReader.ts'
import { CARD_FIELDS, isCardMappingComplete, offsetCancellations, toCardApprovals } from '../../app/utils/cardSpecs.ts'
import { groupByPartner } from '../../app/utils/messageGroups.ts'
import { MESSAGE_FIELDS, isMessageMappingComplete, toMissingRows, withPartnerFallback } from '../../app/utils/messageSpecs.ts'
import { DEFAULT_RECONCILE_OPTIONS, runReconcile } from '../../app/utils/reconcile.ts'
import { BANK_FIELDS, INVOICE_FIELDS, isMappingComplete, toBankTransactions, toTaxInvoices } from '../../app/utils/reconcileSpecs.ts'
import { DEFAULT_ENABLED_TAGS, countFindings, scanApprovals } from '../../app/utils/riskRules.ts'

// test/fixtures의 샘플 엑셀을 실제 읽기 → 변환 → 엔진 경로로 끝까지 돌려 README의 예상 결과와 맞는지 본다
const reader = useExcelReader()
type Loaded<K extends string> = { sheet: RawSheet, detection: HeaderDetection<K>, fileName: string }

const open = async <K extends string>(path: string, specs: readonly FieldSpec<K>[]): Promise<Loaded<K>> => {
  const file = new File([readFileSync(new URL(`../fixtures/${path}`, import.meta.url))], path.split('/').pop() ?? path)
  const workbook = await reader.readWorkbook(file)
  const sheet = reader.pickDefaultSheet(workbook)
  assert.ok(sheet, `${path}: 데이터가 있는 시트`)
  return { sheet, detection: reader.detectColumns(sheet.rows, specs), fileName: file.name }
}
const needsCheck = (issues: readonly ParseIssue[], skipped: readonly number[]): number => new Set([...issues.map(i => i.rowIndex), ...skipped]).size
const parse = <K extends string>(loaded: Loaded<K>, mapping: ColumnMapping<K>, specs: readonly FieldSpec<K>[]): ParsedSheet<ParsedRecord<K>> =>
  reader.parseSheet(loaded.sheet, loaded.fileName, loaded.detection.headerRowIndex, mapping, specs)

test('샘플 Tab 1: 통장·세금계산서 대사 결과가 안내문(README)과 같다', async () => {
  const bankFile = await open('tab1-대사기/1-1_통장거래내역_2026-09.xlsx', BANK_FIELDS)
  assert.ok(isMappingComplete('bank', bankFile.detection.mapping))
  const bankParsed = parse(bankFile, bankFile.detection.mapping, BANK_FIELDS)
  const banks = toBankTransactions(bankParsed.rows)
  const invoiceFile = await open('tab1-대사기/1-2_세금계산서_2026-09.xlsx', INVOICE_FIELDS)
  assert.ok(isMappingComplete('invoice', invoiceFile.detection.mapping))
  const invoices = toTaxInvoices(parse(invoiceFile, invoiceFile.detection.mapping, INVOICE_FIELDS).rows)

  assert.equal(banks.rows.length, 35)
  assert.equal(needsCheck(bankParsed.issues, banks.skipped), 2) // 금액이 N/A인 행, 날짜가 9월 31일인 행
  assert.equal(invoices.rows.length, 15)

  const out = runReconcile(banks.rows, invoices.rows, DEFAULT_RECONCILE_OPTIONS)
  assert.equal(out.ourBizNo, '1112233333')
  assert.equal(out.isOurBizNoEstimated, true)
  const counts = Object.fromEntries(Object.entries(out.summary).map(([status, value]) => [status, value.count]))
  assert.deepEqual(counts, { MATCHED: 10, REVIEW: 1, MISSING: 18, AMOUNT_MISMATCH: 1, INVOICE_ONLY: 3, EXCLUDED: 5 })
})

test('샘플 Tab 1: 헤더를 못 알아보는 파일은 매핑이 완료되지 않아 모달이 뜬다, CP949 CSV는 깨지지 않는다', async () => {
  const unknown = await open('tab1-대사기/1-3_통장_컬럼매핑테스트.xlsx', BANK_FIELDS)
  assert.equal(isMappingComplete('bank', unknown.detection.mapping), false)
  const csv = await open('tab1-대사기/1-4_통장_CP949.csv', BANK_FIELDS)
  const banks = toBankTransactions(parse(csv, csv.detection.mapping, BANK_FIELDS).rows)
  assert.deepEqual(banks.rows.map(r => r.description), ['(주)한빛상사', '새한유통', '(주)행복마트'])
})

test('샘플 Tab 2: 카드 승인내역에서 소명 대상 16건(High 12, Medium 4), 분리 양식 5건', async () => {
  const file = await open('tab2-카드스캐너/2-1_법인카드승인내역_2026-09.xlsx', CARD_FIELDS)
  assert.ok(isCardMappingComplete(file.detection.mapping))
  const converted = toCardApprovals(parse(file, file.detection.mapping, CARD_FIELDS).rows)
  const offset = offsetCancellations(converted.rows)
  assert.equal(offset.offsetCount, 1)
  assert.equal(offset.unmatchedCancels, 1)
  const counts = countFindings(offset.active.length, scanApprovals(offset.active, new Set(DEFAULT_ENABLED_TAGS)))
  assert.deepEqual([offset.active.length, counts.flagged, counts.high, counts.medium], [24, 16, 12, 4])

  const split = await open('tab2-카드스캐너/2-2_법인카드_일자시간분리양식.xlsx', CARD_FIELDS)
  assert.ok(isCardMappingComplete(split.detection.mapping))
  const rows = toCardApprovals(parse(split, split.detection.mapping, CARD_FIELDS).rows).rows
  assert.equal(scanApprovals(rows, new Set(DEFAULT_ENABLED_TAGS)).length, 5)
})

test('샘플 Tab 3: 누락 건 엑셀이 거래처 6곳으로 묶인다', async () => {
  const file = await open('tab3-독촉메시지/3-1_누락건_수동입력.xlsx', MESSAGE_FIELDS)
  const mapping = withPartnerFallback(file.detection.mapping)
  assert.ok(isMessageMappingComplete(mapping))
  const parsed = parse(file, mapping, MESSAGE_FIELDS)
  const converted = toMissingRows(parsed.rows)
  assert.equal(converted.rows.length, 22)
  assert.equal(needsCheck(parsed.issues, converted.skipped), 1) // 날짜가 '확인필요'인 행
  const groups = groupByPartner(converted.rows)
  assert.equal(groups.length, 6)
  assert.equal(groups.find(g => g.name.includes('한빛'))?.count, 3) // 표기가 달라도 사업자번호로 한 곳
  assert.equal(groups.find(g => g.name.includes('잦은'))?.count, 12)
})
