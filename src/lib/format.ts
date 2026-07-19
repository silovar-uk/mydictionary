export function formatShortDate(value: string): string {
  if (!value) return ''
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(date)
}

export function seededRandom(seedText: string): () => number {
  let seed = Array.from(seedText).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 2166136261)
  return () => {
    seed += 0x6d2b79f5
    let value = seed
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
