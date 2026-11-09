import { describe, expect, it } from 'vitest'
import type { DictionaryEntry, Tag } from '../domain/types'
import { merge, type Payload } from './sync'

const date = '2026-01-01T00:00:00.000Z'
const laterDate = '2026-01-02T00:00:00.000Z'
function entry(id: string, patch: Partial<DictionaryEntry> = {}): DictionaryEntry {
  return {
    id, headword: id, normalizedHeadword: id, reading: '', normalizedReading: '',
    entryType: 'word', language: 'ja', shortMeaning: '', meaning: '',
    encounteredDate: '', encounterContext: '', sourceType: '', sourceTitle: '',
    sourceAuthor: '', sourceUrl: '', sourceLocator: '', quotation: '', whySaved: '',
    usageNotes: '', examples: [], tagIds: [], status: 'captured', favorite: false,
    createdAt: date, updatedAt: date, lastViewedAt: '', viewCount: 0,
    randomShownAt: '', randomShownCount: 0, revision: 1, importBatchId: '', deletedAt: '',
    ...patch
  }
}
const tag = (id: string, name: string): Tag => ({
  id, name, normalizedName: name.toLowerCase(), createdAt: date, updatedAt: date
})
function payload(entries: DictionaryEntry[] = [], tags: Tag[] = [], tombstones: Record<string, string> = {}): Payload {
  return { schemaVersion: 'watashi-jiten-sync-v1', entries, tags, tombstones }
}
describe('multi-device merge safety', () => {
  it('adds items from two independent devices without overwriting either', () => {
    const { merged, conflicts } = merge(null, payload([entry('local')]), payload([entry('remote')]), {})
    expect(merged.entries.map((x) => x.id)).toEqual(['local', 'remote'])
    expect(conflicts).toEqual([])
  })
  it('merges independent fields edited from the same base', () => {
    const original = entry('a')
    const { merged, conflicts } = merge(payload([original]),
      payload([entry('a', { meaning: '意味を追加', updatedAt: laterDate })]),
      payload([entry('a', { whySaved: '理由を追加', updatedAt: laterDate })]), {})
    expect(conflicts).toEqual([])
    expect(merged.entries[0].meaning).toBe('意味を追加')
    expect(merged.entries[0].whySaved).toBe('理由を追加')
  })
  it('asks before overwriting the same edited field', () => {
    const base = payload([entry('a')])
    const local = payload([entry('a', { meaning: 'PCの意味' })])
    const remote = payload([entry('a', { meaning: 'スマホの意味' })])
    const result = merge(base, local, remote, {})
    expect(result.conflicts).toHaveLength(1)
    const key = result.conflicts[0].key
    expect(merge(base, local, remote, { [key]: 'remote' }).merged.entries[0].meaning).toBe('スマホの意味')
  })
  it('propagates a permanent deletion from a previously synced item', () => {
    const base = payload([entry('a')])
    const { merged, conflicts } = merge(base, payload([]), payload([entry('a')]), {})
    expect(conflicts).toEqual([])
    expect(merged.entries).toEqual([])
    expect(merged.tombstones.a).toBeTruthy()
  })
  it('raises a conflict when a permanent deletion races with an edit', () => {
    const base = payload([entry('a')])
    const local = payload([])
    const remote = payload([entry('a', { meaning: '新しい記述', updatedAt: laterDate })])
    const result = merge(base, local, remote, {})
    expect(result.conflicts).toHaveLength(1)
    const resolved = merge(base, local, remote, { [result.conflicts[0].key]: 'remote' })
    expect(resolved.merged.entries[0].meaning).toBe('新しい記述')
    expect(resolved.merged.tombstones.a).toBeUndefined()
  })
  it('deduplicates tags by name when joining previously independent dictionaries', () => {
    const local = payload([entry('local', { tagIds: ['local-tag'] })], [tag('local-tag', 'Book')])
    const remote = payload([entry('remote', { tagIds: ['remote-tag'] })], [tag('remote-tag', 'book')])
    const { merged, conflicts } = merge(null, local, remote, {})
    expect(conflicts).toHaveLength(0)
    expect(merged.tags).toHaveLength(1)
    expect(merged.entries[0].tagIds).toEqual(merged.entries[1].tagIds)
  })
  it('does not decrease view counters when merging', () => {
    const base = payload([entry('a')])
    const local = payload([entry('a', { viewCount: 3 })])
    const remote = payload([entry('a', { viewCount: 7 })])
    expect(merge(base, local, remote, {}).merged.entries[0].viewCount).toBe(7)
  })
})
