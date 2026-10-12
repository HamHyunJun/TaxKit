const wonFormatter = new Intl.NumberFormat('ko-KR')
const pad2 = (value: number): string => String(value).padStart(2, '0')

export const formatWon = (value: number): string => wonFormatter.format(value)

// YYYY-MM-DD
export const formatDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

// YYYYMMDD (파일명용)
export const formatDateCompact = (date: Date): string => formatDate(date).replaceAll('-', '')

export const directionLabel = (direction: 'IN' | 'OUT'): string => (direction === 'IN' ? '입금' : '출금')
