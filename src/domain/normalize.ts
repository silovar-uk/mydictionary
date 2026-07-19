export function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
}

export function normalizeText(value: string): string {
  return katakanaToHiragana(
    value
      .normalize('NFKC')
      .toLocaleLowerCase('ja-JP')
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

export function splitTags(value: string): string[] {
  const seen = new Set<string>()
  return value
    .split(/[、,，\n#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const normalized = normalizeText(tag)
      if (!normalized || seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
    .slice(0, 30)
}

export function compactText(value: string, maxLength = 100): string {
  const compacted = value.replace(/\s+/g, ' ').trim()
  return compacted.length > maxLength ? `${compacted.slice(0, maxLength)}…` : compacted
}

export function safeHttpUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}
