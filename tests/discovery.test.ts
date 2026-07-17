import { describe, expect, it } from 'vitest'
import { buildDiscoveryPage, discoveryWeight } from '../src/domain/discovery'
import type { DictionaryEntry } from '../src/domain/types'

function entry(id: string, patch: Partial<DictionaryEntry> = {}): DictionaryEntry {
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastViewedAt: '',
    viewCount: 0,
    randomShownAt: '',
    randomShownCount: 0,
    revision: 1,
    importBatchId: '',
    deletedAt: '',
    ...patch
  }
}

describe('discoveryWeight', () => {
  it('strongly prioritizes entries that have never been viewed', () => {
    const unseen = entry('unseen')
    const recent = entry('recent', { viewCount: 10, lastViewedAt: new Date().toISOString(), randomShownAt: new Date().toISOString() })
    expect(discoveryWeight(unseen, 'thoughtful')).toBeGreaterThan(discoveryWeight(recent, 'thoughtful'))
  })

  it('excludes deleted entries', () => {
    expect(discoveryWeight(entry('deleted', { deletedAt: new Date().toISOString() }), 'thoughtful')).toBe(0)
  })
})

describe('buildDiscoveryPage', () => {
  it('returns unique entries', () => {
    const page = buildDiscoveryPage([entry('a'), entry('b'), entry('c')], 'random', 3, () => 0.1)
    expect(new Set(page.map((item) => item.id)).size).toBe(3)
  })
})
