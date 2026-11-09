import { describe, expect, it } from 'vitest'
import type { DictionaryEntry } from './types'
import { getRecentlyAdded } from './recent'

function entry(id: string, createdAt: string, updatedAt = createdAt, deletedAt = ''): DictionaryEntry {
  return {
    id,
    headword: id,
    normalizedHeadword: id,
    reading: '',
    normalizedReading: '',
    entryType: 'word',
    language: 'ja',
    shortMeaning: '',
    meaning: '',
    encounteredDate: '',
    encounterContext: '',
    sourceType: '',
    sourceTitle: '',
    sourceAuthor: '',
    sourceUrl: '',
    sourceLocator: '',
    quotation: '',
    whySaved: '',
    usageNotes: '',
    examples: [],
    tagIds: [],
    status: 'captured',
    favorite: false,
    createdAt,
    updatedAt,
    lastViewedAt: '',
    viewCount: 0,
    randomShownAt: '',
    randomShownCount: 0,
    revision: 1,
    importBatchId: '',
    deletedAt
  }
}

describe('recently added words', () => {
  const jan = '2026-01-01T00:00:00.000Z'
  const feb = '2026-02-01T00:00:00.000Z'
  const mar = '2026-03-01T00:00:00.000Z'

  it('uses creation date, not recent edit date', () => {
    const first = entry('first', jan, '2026-10-01T00:00:00.000Z')
    const second = entry('second', feb)
    const third = entry('third', mar)
    expect(getRecentlyAdded([first, third, second]).map((item) => item.id))
      .toEqual(['third', 'second', 'first'])
  })

  it('does not include soft deleted items and respects the five-item limit', () => {
    const rows = Array.from({ length: 10 }, (_, n) => entry(String(n), `2026-03-${String(n + 1).padStart(2, '0')}T00:00:00.000Z`))
    rows[9].deletedAt = '2026-04-01T00:00:00.000Z'
    expect(getRecentlyAdded(rows).map((item) => item.id)).toEqual(['8', '7', '6', '5', '4'])
  })

  it('does not mutate caller order and breaks same-date ties consistently', () => {
    const original = [entry('z', jan), entry('a', jan)]
    expect(getRecentlyAdded(original).map((item) => item.id)).toEqual(['a', 'z'])
    expect(original.map((item) => item.id)).toEqual(['z', 'a'])
  })

  it('handles empty data and zero requested items', () => {
    expect(getRecentlyAdded([])).toEqual([])
    expect(getRecentlyAdded([entry('a', jan)], 0)).toEqual([])
  })
})
