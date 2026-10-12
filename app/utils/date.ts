const EXCEL_EPOCH_OFFSET_DAYS = 25569 // 1899-12-30 → 1970-01-01
const MS_PER_DAY = 86_400_000

// y/m/d/h/mi/s가 실제 달력에 존재하는 값일 때만 Date를 만든다 (2026-02-31 같은 값 거부)
const buildDate = (y: number, m: number, d: number, h = 0, mi = 0, s = 0): Date | null => {
  const date = new Date(y, m - 1, d, h, mi, s)
  const valid = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    && date.getHours() === h && date.getMinutes() === mi
  return valid ? date : null
}

const parseExcelSerial = (serial: number): Date | null => {
  if (serial < 1 || serial > 2_958_465) return null
  // 시리얼은 시간대 없는 벽시계 값이므로 UTC 구성요소를 로컬 시각으로 옮긴다
  const utc = new Date(Math.round((serial - EXCEL_EPOCH_OFFSET_DAYS) * MS_PER_DAY))
  return buildDate(
    utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(),
    utc.getUTCHours(), utc.getUTCMinutes(), utc.getUTCSeconds(),
  )
}

const parseDateString = (text: string): Date | null => {
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(text)
  if (compact) return buildDate(Number(compact[1]), Number(compact[2]), Number(compact[3]))

  const full = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text)
  if (!full) return null
  return buildDate(
    Number(full[1]), Number(full[2]), Number(full[3]),
    Number(full[4] ?? 0), Number(full[5] ?? 0), Number(full[6] ?? 0),
  )
}

// 엑셀 시리얼 · YYYY-MM-DD · YYYY.MM.DD · YYYYMMDD · YYYY/MM/DD HH:mm(:ss)를 로컬 시간대 Date로 바꾼다
export const parseDate = (raw: unknown): Date | null => {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null
    // 8자리 정수(20260903)는 시리얼 최대값(2,958,465)보다 크므로 문자열 경로로 보낸다
    return raw >= 10_000_000 ? parseDateString(String(raw)) : parseExcelSerial(raw)
  }
  if (typeof raw !== 'string') return null
  return parseDateString(raw.normalize('NFKC').trim())
}

// 로컬 달력 날짜를 1970-01-01 기준 일수로 바꾼다 (시각·DST와 무관하게 날짜 차이를 정수로 계산하기 위함)
export const toDayNumber = (date: Date): number =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY)
