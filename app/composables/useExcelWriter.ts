import * as XLSX from 'xlsx'
import type { FieldValue } from '~/types/excel'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const MAX_COLUMN_WIDTH = 60
const MS_PER_DAY = 86_400_000

export type SheetData = {
  name: string
  header: readonly string[]
  rows: readonly (readonly FieldValue[])[]
}

type UseExcelWriterReturn = {
  downloadWorkbook: (fileName: string, sheets: readonly SheetData[]) => void
}

// 시트 이름 규칙: 31자 이내, [ ] : * ? / \ 금지
const sanitizeSheetName = (name: string): string => name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet'

const sanitizeFileName = (name: string): string => {
  const safe = name.replace(/[\\/:*?"<>|]/g, '_')
  return safe.toLowerCase().endsWith('.xlsx') ? safe : `${safe}.xlsx`
}

// 한글은 영문의 2배 폭으로 계산해 열 너비를 정한다
const displayWidth = (value: FieldValue): number => {
  const text = value instanceof Date ? 'yyyy-mm-dd hh:mm' : String(value ?? '')
  return [...text].reduce((width, char) => width + ((char.codePointAt(0) ?? 0) > 255 ? 2 : 1), 0)
}

// Date → 엑셀 시리얼 (시간대 변환 없이 로컬 벽시계 값을 그대로 쓴다)
const toExcelSerial = (date: Date): number =>
  (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
    - Date.UTC(1899, 11, 30)) / MS_PER_DAY

const hasTime = (date: Date): boolean => date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0

const cellFormat = (value: FieldValue): string | null => {
  if (value instanceof Date) return hasTime(value) ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd'
  if (typeof value === 'number') return Number.isInteger(value) ? '#,##0' : '0.00'
  return null
}

const buildSheet = (data: SheetData): XLSX.WorkSheet => {
  const body = data.rows.map(row => row.map(value => (value instanceof Date ? toExcelSerial(value) : value)))
  const sheet = XLSX.utils.aoa_to_sheet([[...data.header], ...body])

  data.rows.forEach((row, rowOffset) => {
    row.forEach((value, column) => {
      const format = cellFormat(value)
      const cell = sheet[XLSX.utils.encode_cell({ r: rowOffset + 1, c: column })]
      if (format && cell) cell.z = format
    })
  })

  sheet['!cols'] = data.header.map((header, column) => ({
    wch: Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(displayWidth(header), ...data.rows.map(row => displayWidth(row[column] ?? null))) + 2,
    ),
  }))
  return sheet
}

// 다중 시트 .xlsx를 브라우저 안에서 만들어 바로 내려받는다 (네트워크 사용 없음)
const downloadWorkbook = (fileName: string, sheets: readonly SheetData[]): void => {
  const book = XLSX.utils.book_new()
  const usedNames = new Set<string>()
  for (const data of sheets) {
    let name = sanitizeSheetName(data.name)
    // 시트 이름은 중복될 수 없으므로 뒤에 번호를 붙인다
    for (let n = 2; usedNames.has(name.toLowerCase()); n++) name = `${sanitizeSheetName(data.name).slice(0, 28)} ${n}`
    usedNames.add(name.toLowerCase())
    XLSX.utils.book_append_sheet(book, buildSheet(data), name)
  }

  const output: ArrayBuffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' })
  const url = URL.createObjectURL(new Blob([output], { type: XLSX_MIME }))
  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeFileName(fileName)
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const useExcelWriter = (): UseExcelWriterReturn => ({ downloadWorkbook })
