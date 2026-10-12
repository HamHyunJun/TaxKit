// 숫자만 남겨 10자리일 때만 사업자번호로 인정한다
export const normalizeBizNo = (raw: unknown): string | null => {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const digits = String(raw).replace(/\D/g, '')
  return digits.length === 10 ? digits : null
}

// 0000000000 → 000-00-00000
export const formatBizNo = (digits: string): string =>
  `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
