import type { FieldValue } from '../types/excel.ts'

// 정규화된 셀 값(FieldValue)을 용도에 맞는 타입으로 좁힌다. 맞지 않거나 비었으면 null
export const asNumber = (value: FieldValue): number | null => (typeof value === 'number' ? value : null)
export const asText = (value: FieldValue): string | null => (typeof value === 'string' && value !== '' ? value : null)
export const asDate = (value: FieldValue): Date | null => (value instanceof Date ? value : null)
