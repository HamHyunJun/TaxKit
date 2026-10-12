const wonFormatter = new Intl.NumberFormat('ko-KR')
const pad2 = (value: number): string => String(value).padStart(2, '0')

export const formatWon = (value: number): string => wonFormatter.format(value)

// YYYY-MM-DD
export const formatDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

// YYYYMMDD (파일명용)
export const formatDateCompact = (date: Date): string => formatDate(date).replaceAll('-', '')

export const directionLabel = (direction: 'IN' | 'OUT'): string => (direction === 'IN' ? '입금' : '출금')

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// HH:mm
export const formatTime = (date: Date): string => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`

// YYYY-MM-DD(요일) HH:mm — 시각 정보가 없는 파일이면 날짜와 요일만 보여준다
export const formatDateTime = (date: Date, hasTime: boolean): string => {
  const day = `${formatDate(date)}(${WEEKDAYS[date.getDay()] ?? ''})`
  return hasTime ? `${day} ${formatTime(date)}` : day
}
