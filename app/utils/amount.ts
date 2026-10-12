// 금액 문자열/숫자를 원 단위 정수로 바꾼다. 해석할 수 없으면 null
// (1,000) · -1,000 · △1,000 · ▲1,000 은 음수로 본다
export const parseAmount = (raw: unknown): number | null => {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? roundWon(raw) : null
  }
  if (typeof raw !== 'string') return null

  let text = raw.normalize('NFKC').replace(/[,\s원]/g, '')
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  }
  if (/^[-△▲]/.test(text)) {
    negative = !negative
    text = text.slice(1)
  }
  if (!/^\d+(\.\d+)?$/.test(text)) return null

  const value = Number(text)
  return roundWon(negative ? -value : value)
}

// Math.round(-0.4)가 -0을 만들지 않도록 0으로 통일한다
const roundWon = (value: number): number => Math.round(value) || 0
