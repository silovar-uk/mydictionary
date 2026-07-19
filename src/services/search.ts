import MiniSearch from 'minisearch'
import { normalizeText } from '../domain/normalize'
import type { DictionaryEntry, Tag } from '../domain/types'

interface SearchDocument {
  id: string
  headword: string
  reading: string
  shortMeaning: string
  body: string
  tags: string
}

export interface SearchHit {
  entry: DictionaryEntry
  score: number
  reason: string
}

interface SearchCache {
  entries: DictionaryEntry[]
  tags: Tag[]
  miniSearch: MiniSearch<SearchDocument>
  byId: Map<string, DictionaryEntry>
  tagTextByEntry: Map<string, string>
  haystackByEntry: Map<string, string>
}

let cache: SearchCache | null = null

function buildBody(entry: DictionaryEntry): string {
  return [
    entry.meaning,
    entry.encounterContext,
    entry.sourceTitle,
    entry.sourceAuthor,
    entry.quotation,
    entry.whySaved,
    entry.usageNotes,
    entry.examples.join(' ')
  ]
    .filter(Boolean)
    .join(' ')
}

function buildReason(entry: DictionaryEntry, query: string, tags: string): string {
  const normalized = normalizeText(query)
  if (entry.normalizedHeadword.includes(normalized)) return '見出し語に一致'
  if (entry.normalizedReading.includes(normalized)) return '読みに一致'
  if (normalizeText(tags).includes(normalized)) return 'タグに一致'
  if (normalizeText(entry.shortMeaning).includes(normalized)) return '一言の意味に一致'
  if (normalizeText(entry.encounterContext).includes(normalized)) return '出会った場面に一致'
  if (normalizeText(entry.usageNotes).includes(normalized)) return '使い方に一致'
  return '本文に一致'
}

function ensureCache(entries: DictionaryEntry[], tags: Tag[]): SearchCache {
  if (cache?.entries === entries && cache.tags === tags) return cache

  const tagMap = new Map(tags.map((tag) => [tag.id, tag.name]))
  const tagTextByEntry = new Map<string, string>()
  const haystackByEntry = new Map<string, string>()
  const documents: SearchDocument[] = entries.map((entry) => {
    const tagText = entry.tagIds.map((id) => tagMap.get(id) ?? '').join(' ')
    const body = buildBody(entry)
    tagTextByEntry.set(entry.id, tagText)
    haystackByEntry.set(entry.id, normalizeText([entry.headword, entry.reading, entry.shortMeaning, tagText, body].join(' ')))
    return {
      id: entry.id,
      headword: normalizeText(entry.headword),
      reading: normalizeText(entry.reading),
      shortMeaning: normalizeText(entry.shortMeaning),
      body: normalizeText(body),
      tags: normalizeText(tagText)
    }
  })

  const miniSearch = new MiniSearch<SearchDocument>({
    fields: ['headword', 'reading', 'shortMeaning', 'tags', 'body'],
    storeFields: ['id'],
    searchOptions: {
      boost: { headword: 8, reading: 5, tags: 4, shortMeaning: 3, body: 1 },
      prefix: true
    },
    tokenize: (value) => {
      const normalized = normalizeText(value)
      const compact = normalized.replace(/\s+/g, '')
      const words = normalized.split(/\s+/).filter(Boolean)
      const bigrams: string[] = []
      for (let i = 0; i < compact.length - 1; i += 1) bigrams.push(compact.slice(i, i + 2))
      return [...new Set([...words, ...bigrams, compact])]
    }
  })
  miniSearch.addAll(documents)

  cache = {
    entries,
    tags,
    miniSearch,
    byId: new Map(entries.map((entry) => [entry.id, entry])),
    tagTextByEntry,
    haystackByEntry
  }
  return cache
}

export function searchEntries(entries: DictionaryEntry[], tags: Tag[], query: string): SearchHit[] {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return entries.map((entry) => ({ entry, score: 0, reason: '' }))

  const index = ensureCache(entries, tags)
  const direct = entries
    .filter((entry) => index.haystackByEntry.get(entry.id)?.includes(normalizedQuery))
    .map((entry) => {
      const exact = entry.normalizedHeadword === normalizedQuery
      const prefix = entry.normalizedHeadword.startsWith(normalizedQuery)
      return {
        entry,
        score: exact ? 1000 : prefix ? 700 : entry.normalizedHeadword.includes(normalizedQuery) ? 500 : 200,
        reason: buildReason(entry, query, index.tagTextByEntry.get(entry.id) ?? '')
      }
    })

  if (normalizedQuery.length === 1) return direct.sort((a, b) => b.score - a.score)

  const fuzzy = normalizedQuery.length >= 3 ? 0.2 : false
  const miniHits = index.miniSearch.search(normalizedQuery, { fuzzy }).flatMap((result) => {
    const entry = index.byId.get(String(result.id))
    if (!entry) return []
    return [{
      entry,
      score: result.score * 10,
      reason: buildReason(entry, query, index.tagTextByEntry.get(entry.id) ?? '')
    }]
  })

  const merged = new Map<string, SearchHit>()
  for (const hit of [...miniHits, ...direct]) {
    const previous = merged.get(hit.entry.id)
    if (!previous || hit.score > previous.score) merged.set(hit.entry.id, hit)
  }
  return [...merged.values()].sort((a, b) => b.score - a.score)
}
