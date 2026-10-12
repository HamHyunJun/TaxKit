import type { MissingEvidenceRow, PartnerGroup } from '~/types/message'

const mostFrequent = (values: readonly string[]): string => {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best = values[0] ?? ''
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

// 거래처별로 묶는다: 사업자번호가 있으면 그것을, 없으면 상호 정규화 키를 그룹 키로 쓴다. 합계 큰 순으로 정렬
export const groupByPartner = (rows: readonly MissingEvidenceRow[]): PartnerGroup[] => {
  const buckets = new Map<string, MissingEvidenceRow[]>()
  for (const row of rows) {
    const key = row.partnerBizNo ?? `name:${normalizeCompanyName(row.partnerName) || row.partnerName}`
    const bucket = buckets.get(key)
    if (bucket) bucket.push(row)
    else buckets.set(key, [row])
  }

  const groups: PartnerGroup[] = []
  for (const [key, bucket] of buckets) {
    const sorted = [...bucket].sort((a, b) => a.date.getTime() - b.date.getTime())
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    if (!first || !last) continue
    groups.push({
      key,
      name: mostFrequent(sorted.map(row => row.partnerName)),
      bizNo: sorted.find(row => row.partnerBizNo !== null)?.partnerBizNo ?? null,
      rows: sorted,
      count: sorted.length,
      total: sorted.reduce((sum, row) => sum + row.amount, 0),
      firstDate: first.date,
      lastDate: last.date,
    })
  }
  return groups.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ko'))
}

// 이름이나 사업자번호의 일부로 거래처를 찾는다
export const matchesPartner = (group: PartnerGroup, query: string): boolean => {
  const text = query.trim().toLowerCase()
  if (text === '') return true
  const digits = text.replace(/\D/g, '')
  return group.name.toLowerCase().includes(text)
    || normalizeCompanyName(group.name).includes(normalizeCompanyName(text))
    || (digits !== '' && (group.bizNo ?? '').includes(digits))
}
