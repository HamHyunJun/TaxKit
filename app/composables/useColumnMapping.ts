import type { ColumnMapping } from '~/types/excel'

const STORAGE_PREFIX = 'taxkit:colmap:'

type UseColumnMappingReturn = {
  getSignature: (headers: readonly string[]) => string
  loadMapping: <K extends string>(signature: string, keys: readonly K[]) => ColumnMapping<K> | null
  saveMapping: <K extends string>(signature: string, mapping: ColumnMapping<K>) => void
}

// 정렬한 헤더 문자열의 DJB2 해시 (암호학적 용도가 아닌 양식 식별용)
const hashHeaders = (headers: readonly string[]): string => {
  const text = headers.map(header => header.replace(/\s/g, '')).sort().join('|')
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

const isColumnIndex = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

// 매핑 시그니처만 저장한다. 행 데이터는 저장하지 않는다 (CLAUDE.md 3-4)
export const useColumnMapping = (): UseColumnMappingReturn => {
  const getSignature = (headers: readonly string[]): string => hashHeaders(headers)

  const loadMapping = <K extends string>(signature: string, keys: readonly K[]): ColumnMapping<K> | null => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_PREFIX + signature) ?? 'null')
      if (typeof stored !== 'object' || stored === null) return null
      const mapping: ColumnMapping<K> = {}
      for (const key of keys) {
        const index: unknown = Reflect.get(stored, key)
        if (isColumnIndex(index)) mapping[key] = index
      }
      return mapping
    }
    catch {
      return null
    }
  }

  const saveMapping = <K extends string>(signature: string, mapping: ColumnMapping<K>): void => {
    try {
      localStorage.setItem(STORAGE_PREFIX + signature, JSON.stringify(mapping))
    }
    catch {
      // 저장소 차단(시크릿 모드 등)이어도 기능은 계속 동작한다
    }
  }

  return { getSignature, loadMapping, saveMapping }
}
