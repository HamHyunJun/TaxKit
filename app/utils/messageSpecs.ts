import type { ColumnMapping, FieldSpec, FieldValue, ParsedRecord } from '~/types/excel'
import type { MissingEvidenceRow } from '~/types/message'

export type MessageFieldKey = 'partnerName' | 'partnerBizNo' | 'date' | 'amount' | 'description' | 'contact'

// 컬럼 별칭 사전 (PRD 4.3 D). 거래처명 열이 없으면 적요 열을 거래처명으로 쓴다 (Tab 1 결과 엑셀의 '누락의심' 시트)
export const MESSAGE_FIELDS: readonly FieldSpec<MessageFieldKey>[] = [
  { key: 'partnerName', label: '거래처명', aliases: ['거래처', '거래처명', '상호'], kind: 'text', required: true },
  { key: 'partnerBizNo', label: '사업자번호', aliases: ['사업자번호', '사업자등록번호'], kind: 'bizNo', required: false },
  { key: 'date', label: '거래일자', aliases: ['거래일자', '거래일', '일자'], kind: 'date', required: true },
  { key: 'amount', label: '금액', aliases: ['금액', '거래금액'], kind: 'amount', required: true },
  { key: 'description', label: '적요', aliases: ['적요', '내용'], kind: 'text', required: false },
  { key: 'contact', label: '연락처', aliases: ['연락처', '담당자'], kind: 'text', required: false },
]

// 거래처 열이 따로 없고 적요 열만 있으면 적요를 거래처명으로 본다
export const withPartnerFallback = (mapping: ColumnMapping): ColumnMapping =>
  mapping['partnerName'] === undefined && mapping['description'] !== undefined
    ? { ...mapping, partnerName: mapping['description'] }
    : mapping

export const isMessageMappingComplete = (mapping: ColumnMapping): boolean =>
  MESSAGE_FIELDS.every(field => !field.required || mapping[field.key] !== undefined)

const asNumber = (value: FieldValue): number | null => (typeof value === 'number' ? value : null)
const asText = (value: FieldValue): string | null => (typeof value === 'string' && value !== '' ? value : null)
const asDate = (value: FieldValue): Date | null => (value instanceof Date ? value : null)

export const toMissingRows = (records: readonly ParsedRecord<MessageFieldKey>[]): { rows: MissingEvidenceRow[], skipped: number[] } => {
  const rows: MissingEvidenceRow[] = []
  const skipped: number[] = []
  for (const record of records) {
    const partnerName = asText(record.partnerName)
    const date = asDate(record.date)
    const amount = asNumber(record.amount)
    if (!partnerName || !date || amount === null) {
      skipped.push(record.rowIndex)
      continue
    }
    rows.push({
      partnerName,
      partnerBizNo: asText(record.partnerBizNo),
      date,
      amount,
      description: asText(record.description),
      contact: asText(record.contact),
    })
  }
  return { rows, skipped }
}
