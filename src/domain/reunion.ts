import type { DictionaryEntry } from './types'
import { normalizeText } from './normalize'

/**
 * An index of past captures, not a list of duplicate concepts.
 * Two records with the same spelling always retain their independent IDs.
 */
export type ReunionIndex = ReadonlyMap<string, readonly DictionaryEntry[]>

export function buildReunionIndex(entries: readonly DictionaryEntry[]): ReunionIndex {
  const index = new Map<string, DictionaryEntry[]>()
  for (const entry of entries) {
    if (entry.deletedAt) continue
    const key = entry.normalizedHeadword || normalizeText(entry.headword)
    if (!key) continue
    const previous = index.get(key)
    if (previous) previous.push(entry)
    else index.set(key, [entry])
  }

  for (const matches of index.values()) {
    matches.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
    )
  }
  return index
}

export function findMatchesInReunionIndex(
  index: ReunionIndex,
  headword: string,
  excludeEntryId?: string
): DictionaryEntry[] {
  const key = normalizeText(headword)
  if (!key) return []
  const matches = index.get(key) ?? []
  return matches.filter((entry) => entry.id !== excludeEntryId)
}

export function findSameSpellingEntries(
  entries: readonly DictionaryEntry[],
  headword: string,
  excludeEntryId?: string
): DictionaryEntry[] {
  return findMatchesInReunionIndex(buildReunionIndex(entries), headword, excludeEntryId)
}
