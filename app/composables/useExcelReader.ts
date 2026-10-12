import * as XLSX from 'xlsx'
import type {
  ColumnMapping,
  FieldSpec,
  FieldValue,
  HeaderDetection,
  ParseIssue,
  ParsedRecord,
  ParsedSheet,
  RawSheet,
  RawWorkbook,
} from '~/types/excel'
import { parseAmount } from '../utils/amount.ts'
import { parseDate } from '../utils/date.ts'
import { normalizeBizNo } from '../utils/bizNo.ts'

const HEADER_SCAN_ROWS = 30

type UseExcelReaderReturn = {
  readWorkbook: (file: File) => Promise<RawWorkbook>
  pickDefaultSheet: (workbook: RawWorkbook) => RawSheet | null
  detectColumns: <K extends string>(rows: readonly unknown[][], specs: readonly FieldSpec<K>[]) => HeaderDetection<K>
  mapHeaders: <K extends string>(headers: readonly string[], specs: readonly FieldSpec<K>[]) => ColumnMapping<K>
  parseSheet: <K extends string>(
    sheet: RawSheet,
    fileName: string,
    headerRowIndex: number,
    mapping: ColumnMapping<K>,
    specs: readonly FieldSpec<K>[],
  ) => ParsedSheet<ParsedRecord<K>>
}

const isEmptyCell = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

const cellToText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''

// 헤더 비교용: 공백·괄호·줄바꿈을 지우고 소문자로 맞춘다
const normalizeHeader = (value: unknown): string =>
  cellToText(value).normalize('NFKC').replace(/[\s()[\]{}]/g, '').toLowerCase()

// CSV는 UTF-8을 먼저 시도하고 실패하면 CP949(EUC-KR 디코더)로 읽는다
const decodeCsv = (buffer: ArrayBuffer): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  }
  catch {
    return new TextDecoder('euc-kr').decode(buffer)
  }
}

// 시트를 엑셀 행 번호와 어긋남 없이(A1부터) 2차원 배열로 바꾸고 뒤쪽 빈 행을 자른다
const sheetToRows = (sheet: XLSX.WorkSheet): unknown[][] => {
  const ref = sheet['!ref']
  if (!ref) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
    range: { s: { r: 0, c: 0 }, e: XLSX.utils.decode_range(ref).e },
  })
  while (rows.length > 0 && (rows[rows.length - 1] ?? []).every(isEmptyCell)) rows.pop()
  return rows
}

const mapHeaders = <K extends string>(headers: readonly string[], specs: readonly FieldSpec<K>[]): ColumnMapping<K> => {
  const normalized = headers.map(normalizeHeader)
  const used = new Set<number>()
  const mapping: ColumnMapping<K> = {}
  for (const spec of specs) {
    const aliases = spec.aliases.map(normalizeHeader)
    const index = normalized.findIndex((header, i) => !used.has(i) && aliases.includes(header))
    if (index >= 0) {
      mapping[spec.key] = index
      used.add(index)
    }
  }
  return mapping
}

// 상위 30행 중 별칭과 일치하는 셀이 가장 많은 행을 헤더로 고른다 (동률이면 위쪽)
const detectColumns = <K extends string>(
  rows: readonly unknown[][],
  specs: readonly FieldSpec<K>[],
): HeaderDetection<K> => {
  const aliasSet = new Set(specs.flatMap(spec => spec.aliases.map(normalizeHeader)))
  let headerRowIndex = 0
  let bestCount = 0
  rows.slice(0, HEADER_SCAN_ROWS).forEach((row, index) => {
    const count = row.filter(cell => aliasSet.has(normalizeHeader(cell))).length
    if (count > bestCount) {
      bestCount = count
      headerRowIndex = index
    }
  })
  const headers = (rows[headerRowIndex] ?? []).map(cellToText)
  const mapping = mapHeaders(headers, specs)
  const missing = specs.filter(spec => spec.required && mapping[spec.key] === undefined).map(spec => spec.key)
  return { headerRowIndex, headers, mapping, missing }
}

// 셀 하나를 필드 종류에 맞게 정규화한다. 실패하면 값은 null, 사유는 ParseIssue로 돌려준다
const normalizeCell = (raw: unknown, spec: FieldSpec, rowIndex: number): [FieldValue, ParseIssue | null] => {
  const fail = (reason: ParseIssue['reason']): [FieldValue, ParseIssue] => [null, { rowIndex, field: spec.key, rawValue: raw, reason }]
  if (isEmptyCell(raw)) return spec.required ? fail('EMPTY_REQUIRED') : [null, null]

  if (spec.kind === 'amount') {
    const value = parseAmount(raw)
    return value === null ? fail('INVALID_NUMBER') : [value, null]
  }
  if (spec.kind === 'date') {
    const value = parseDate(raw)
    return value === null ? fail('INVALID_DATE') : [value, null]
  }
  if (spec.kind === 'bizNo') {
    const value = normalizeBizNo(raw)
    return value === null ? fail('UNKNOWN') : [value, null]
  }
  return [cellToText(raw), null]
}

// 헤더 아래 행을 정규화한다. 문제가 있는 행도 버리지 않고 issues에 담는다
const parseSheet = <K extends string>(
  sheet: RawSheet,
  fileName: string,
  headerRowIndex: number,
  mapping: ColumnMapping<K>,
  specs: readonly FieldSpec<K>[],
): ParsedSheet<ParsedRecord<K>> => {
  const records: ParsedRecord<K>[] = []
  const issues: ParseIssue[] = []

  sheet.rows.slice(headerRowIndex + 1).forEach((row, offset) => {
    if (row.every(isEmptyCell)) return
    const rowIndex = headerRowIndex + 2 + offset // 엑셀 1-based 행 번호
    const values: Partial<Record<K, FieldValue>> = {}
    for (const spec of specs) {
      const column = mapping[spec.key]
      const [value, issue] = normalizeCell(column === undefined ? null : row[column], spec, rowIndex)
      values[spec.key] = value
      if (issue) issues.push(issue)
    }
    records.push({ ...values, rowIndex } as ParsedRecord<K>)
  })

  return { fileName, sheetName: sheet.name, headerRowIndex, rows: records, issues }
}

const readWorkbook = async (file: File): Promise<RawWorkbook> => {
  const buffer = await file.arrayBuffer()
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  let book: XLSX.WorkBook
  try {
    book = isCsv
      ? XLSX.read(decodeCsv(buffer), { type: 'string', raw: true })
      : XLSX.read(buffer, { type: 'array' })
  }
  catch {
    throw new Error('파일을 읽을 수 없어요. 손상되었거나 지원하지 않는 형식일 수 있어요')
  }
  const sheets = book.SheetNames.map((name): RawSheet => {
    const sheet = book.Sheets[name]
    return { name, rows: sheet ? sheetToRows(sheet) : [] }
  })
  return { fileName: file.name, sheets }
}

// 데이터가 있는 첫 번째 시트
const pickDefaultSheet = (workbook: RawWorkbook): RawSheet | null =>
  workbook.sheets.find(sheet => sheet.rows.length > 0) ?? null

export const useExcelReader = (): UseExcelReaderReturn => ({
  readWorkbook,
  pickDefaultSheet,
  detectColumns,
  mapHeaders,
  parseSheet,
})
