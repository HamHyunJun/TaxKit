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

const toSeconds = (h: number, m: number, s: number): number | null =>
  h < 24 && m < 60 && s < 60 ? h * 3600 + m * 60 + s : null

// 시각 → 하루 중 초. "23:42", "23:42:10", 숫자 HHMMSS(엑셀이 앞의 0을 지운 90510=09:05:10 포함), 엑셀 시간(0.9875)을 지원한다
export const parseTimeOfDay = (raw: unknown): number | null => {
  const text = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.normalize('NFKC').trim() : ''
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text)
  if (clock) return toSeconds(Number(clock[1]), Number(clock[2]), Number(clock[3] ?? 0))

  if (/^\d{3,6}$/.test(text)) {
    // shortcut: 3~4자리는 HHMM으로 먼저 본다. 4자리인데 시가 24 이상이면(3015=00:30:15) HHMMSS로 본다 (1430은 14:30으로 읽는다)
    if (text.length <= 4) {
      const hhmm = text.padStart(4, '0')
      const result = toSeconds(Number(hhmm.slice(0, 2)), Number(hhmm.slice(2)), 0)
      if (result !== null || text.length === 3) return result
    }
    const hhmmss = text.padStart(6, '0')
    return toSeconds(Number(hhmmss.slice(0, 2)), Number(hhmmss.slice(2, 4)), Number(hhmmss.slice(4)))
  }
  if (/^\d*\.\d+$/.test(text)) return Math.round(Number(text) * 86_400) % 86_400
  return null
}
