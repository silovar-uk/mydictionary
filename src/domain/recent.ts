import type { DictionaryEntry } from './types'

/** Recently captured words, not recently edited or viewed words. */
export function getRecentlyAdded(entries: readonly DictionaryEntry[], limit = 5): DictionaryEntry[] {
  return [...entries]
    .filter((entry) => !entry.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit))
}
