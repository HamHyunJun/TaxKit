export type ParseIssue = {
  rowIndex: number // 원본 엑셀 기준 1-based 행 번호
  field: string
  rawValue: unknown
  reason: 'EMPTY_REQUIRED' | 'INVALID_DATE' | 'INVALID_NUMBER' | 'UNKNOWN'
}

// headerRowIndex는 rows 배열 기준 0-based 인덱스다 (엑셀 행 번호 = 인덱스 + 1)
export type ParsedSheet<T> = {
  fileName: string
  sheetName: string
  headerRowIndex: number
  rows: T[]
  issues: ParseIssue[]
}

type FieldKind = 'text' | 'amount' | 'date' | 'bizNo'

// 탭별 별칭 사전의 한 항목: 어떤 헤더 이름이 어떤 필드가 되고 어떻게 정규화할지
export type FieldSpec<K extends string = string> = {
  key: K
  label: string
  aliases: readonly string[]
  kind: FieldKind
  required: boolean
}

// 필드 키 → 열 인덱스(0-based)
export type ColumnMapping<K extends string = string> = Partial<Record<K, number>>

export type FieldValue = string | number | Date | null

// rowIndex는 원본 엑셀 기준 1-based 행 번호
export type ParsedRecord<K extends string> = Record<K, FieldValue> & { rowIndex: number }

export type RawSheet = {
  name: string
  rows: unknown[][]
}

export type RawWorkbook = {
  fileName: string
  sheets: RawSheet[]
}

export type HeaderDetection<K extends string> = {
  headerRowIndex: number
  headers: string[]
  mapping: ColumnMapping<K>
  missing: K[] // 매핑되지 않은 필수 필드
}
