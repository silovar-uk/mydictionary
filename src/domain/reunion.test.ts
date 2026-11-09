import { describe, expect, it } from 'vitest'
import type { DictionaryEntry } from './types'
import { normalizeText } from './normalize'
import { buildReunionIndex, findMatchesInReunionIndex, findSameSpellingEntries } from './reunion'

const baseTime = '2026-01-01T00:00:00.000Z'
function entry(id: string, headword: string, patch: Partial<DictionaryEntry> = {}): DictionaryEntry {
  return {
    id, headword, normalizedHeadword: normalizeText(headword),
    reading: '', normalizedReading: '', entryType: 'word', language: 'ja',
    shortMeaning: '', meaning: '', encounteredDate: '', encounterContext: '',
    sourceType: '', sourceTitle: '', sourceAuthor: '', sourceUrl: '',
    sourceLocator: '', quotation: '', whySaved: '', usageNotes: '', examples: [],
    tagIds: [], status: 'captured', favorite: false,
    createdAt: baseTime, updatedAt: baseTime, lastViewedAt: '', viewCount: 0,
    randomShownAt: '', randomShownCount: 0, revision: 1, importBatchId: '', deletedAt: '',
    ...patch
  }
}

describe('reunion: independent captures of the same spelling', () => {
  it('stays silent for blank input and new words', () => {
    const entries = [entry('a', '余白')]
    expect(findSameSpellingEntries(entries, '')).toEqual([])
    expect(findSameSpellingEntries(entries, '   ')).toEqual([])
    expect(findSameSpellingEntries(entries, '別の言葉')).toEqual([])
    expect(findSameSpellingEntries([], '余白')).toEqual([])
  })

  it('uses only existing normalizer equivalence: width, case and kana', () => {
    const entries = [entry('a', 'ＡＢＣ'), entry('b', 'カタカナ')]
    expect(findSameSpellingEntries(entries, 'abc').map((e) => e.id)).toEqual(['a'])
    expect(findSameSpellingEntries(entries, 'かたかな').map((e) => e.id)).toEqual(['b'])
    expect(findSameSpellingEntries(entries, 'ＡＢ').map((e) => e.id)).toEqual([])
    expect(findSameSpellingEntries(entries, 'abc something')).toEqual([])
  })

  it('does not merge same-spelling records with different interpretations', () => {
    const entries = [
      entry('work', '余白', { shortMeaning: '工数に余裕を作る' }),
      entry('book', '余白', { shortMeaning: '読後の余韻' })
    ]
    expect(findSameSpellingEntries(entries, '余白').map((e) => e.id)).toEqual(['book', 'work'])
    expect(findSameSpellingEntries(entries, '余白').map((e) => e.shortMeaning))
      .toEqual(['読後の余韻', '工数に余裕を作る'])
  })

  it('orders newest captures first and breaks creation time ties by ID', () => {
    const entries = [
      entry('z', '余白'),
      entry('a', '余白'),
      entry('m', '余白', { createdAt: '2026-03-01T00:00:00.000Z' }),
      entry('c', '余白', { createdAt: '2025-01-01T00:00:00.000Z' })
    ]
    expect(findSameSpellingEntries(entries, '余白').map((e) => e.id)).toEqual(['m', 'a', 'z', 'c'])
  })

  it('ignores soft-deleted records and can exclude a current entry', () => {
    const entries = [
      entry('gone', '余白', { deletedAt: '2026-05-01T00:00:00.000Z' }),
      entry('current', '余白'),
      entry('previous', '余白')
    ]
    expect(findSameSpellingEntries(entries, '余白', 'current').map((e) => e.id)).toEqual(['previous'])
  })

  it('preserves every separate ID including more than three candidates', () => {
    const entries = Array.from({ length: 10 }, (_, i) => entry('id-' + i, '余白'))
    expect(findSameSpellingEntries(entries, '余白')).toHaveLength(10)
    expect(new Set(findSameSpellingEntries(entries, '余白').map((e) => e.id)).size).toBe(10)
  })

  it('does not mutate input, saved fields or order', () => {
    const entries = [
      entry('b', '余白', { shortMeaning: '後から見ても変わらない', revision: 3 }),
      entry('a', '余白', { createdAt: '2026-07-01T00:00:00.000Z' })
    ]
    const before = structuredClone(entries)
    const index = buildReunionIndex(entries)
    expect(findMatchesInReunionIndex(index, '余白')).toHaveLength(2)
    expect(entries).toEqual(before)
    expect(entries.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('reuses indexed groups without scanning input on each lookup', () => {
    const many = Array.from({ length: 10000 }, (_, i) => entry('id-' + i, i % 2 ? '余白' : '余裕'))
    const index = buildReunionIndex(many)
    expect(findMatchesInReunionIndex(index, '余白')).toHaveLength(5000)
    expect(findMatchesInReunionIndex(index, '余裕')).toHaveLength(5000)
  })

  it('falls back to deriving a normalized key for a legacy record with missing key', () => {
    const entries = [entry('a', 'ＡＢＣ', { normalizedHeadword: '' })]
    expect(findSameSpellingEntries(entries, 'abc').map((e) => e.id)).toEqual(['a'])
  })
})
