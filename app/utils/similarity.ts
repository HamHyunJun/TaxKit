const bigrams = (text: string): string[] => {
  const grams: string[] = []
  for (let i = 0; i < text.length - 1; i++) grams.push(text.slice(i, i + 2))
  return grams
}

// 문자 bigram Dice 계수 (0~1)
export const diceCoefficient = (a: string, b: string): number => {
  if (a === b) return a.length > 0 ? 1 : 0
  const gramsA = bigrams(a)
  const gramsB = bigrams(b)
  if (gramsA.length === 0 || gramsB.length === 0) return 0
  const counts = new Map<string, number>()
  for (const gram of gramsA) counts.set(gram, (counts.get(gram) ?? 0) + 1)
  let shared = 0
  for (const gram of gramsB) {
    const left = counts.get(gram) ?? 0
    if (left > 0) {
      shared += 1
      counts.set(gram, left - 1)
    }
  }
  return (2 * shared) / (gramsA.length + gramsB.length)
}

const jaro = (a: string, b: string): number => {
  if (a === b) return a.length > 0 ? 1 : 0
  if (a.length === 0 || b.length === 0) return 0
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const matchedA: boolean[] = new Array<boolean>(a.length).fill(false)
  const matchedB: boolean[] = new Array<boolean>(b.length).fill(false)
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    const from = Math.max(0, i - range)
    const to = Math.min(b.length - 1, i + range)
    for (let j = from; j <= to; j++) {
      if (!matchedB[j] && a[i] === b[j]) {
        matchedA[i] = true
        matchedB[j] = true
        matches += 1
        break
      }
    }
  }
  if (matches === 0) return 0
  let transpositions = 0
  let cursor = 0
  for (let i = 0; i < a.length; i++) {
    if (!matchedA[i]) continue
    while (!matchedB[cursor]) cursor += 1
    if (a[i] !== b[cursor]) transpositions += 1
    cursor += 1
  }
  return (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3
}

// Jaro-Winkler 유사도 (공통 접두사 최대 4자에 가산점)
export const jaroWinkler = (a: string, b: string): number => {
  const base = jaro(a, b)
  let prefix = 0
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix += 1
  return base + prefix * 0.1 * (1 - base)
}

// 정규화된 상호 키끼리의 유사도: 포함 관계면 1, 아니면 Dice와 Jaro-Winkler 중 큰 값
export const nameSimilarity = (a: string, b: string): number => {
  if (a.length === 0 || b.length === 0) return 0
  const shorter = a.length <= b.length ? a : b
  const longer = shorter === a ? b : a
  if (shorter.length >= 2 && longer.includes(shorter)) return 1
  return Math.max(diceCoefficient(a, b), jaroWinkler(a, b))
}
