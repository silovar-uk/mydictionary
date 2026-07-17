import { db, notifyDatabaseChanged } from '../db/database'
import { normalizeText, safeHttpUrl } from '../domain/normalize'
import type { DictionaryEntry, EntryDraft, EntryUpdate, Tag } from '../domain/types'

function nowIso(): string {
  return new Date().toISOString()
}

function uuid(): string {
  return crypto.randomUUID()
}

function createBaseEntry(draft: EntryDraft, tagIds: string[]): DictionaryEntry {
  const now = nowIso()
  const headword = draft.headword.trim()
  return {
    id: uuid(),
    headword,
    normalizedHeadword: normalizeText(headword),
    reading: draft.reading?.trim() ?? '',
    normalizedReading: normalizeText(draft.reading ?? ''),
    entryType: draft.entryType ?? 'word',
    language: draft.language ?? 'ja',
    shortMeaning: draft.shortMeaning?.trim() ?? '',
    meaning: draft.meaning?.trim() ?? '',
    encounteredDate: draft.encounteredDate ?? '',
    encounterContext: draft.encounterContext?.trim() ?? '',
    sourceType: draft.sourceType ?? '',
    sourceTitle: draft.sourceTitle?.trim() ?? '',
    sourceAuthor: draft.sourceAuthor?.trim() ?? '',
    sourceUrl: safeHttpUrl(draft.sourceUrl ?? ''),
    sourceLocator: draft.sourceLocator?.trim() ?? '',
    quotation: draft.quotation?.trim() ?? '',
    whySaved: draft.whySaved?.trim() ?? '',
    usageNotes: draft.usageNotes?.trim() ?? '',
    examples: draft.examples?.map((value) => value.trim()).filter(Boolean) ?? [],
    tagIds,
    status: draft.status ?? 'captured',
    favorite: draft.favorite ?? false,
    createdAt: now,
    updatedAt: now,
    lastViewedAt: '',
    viewCount: 0,
    randomShownAt: '',
    randomShownCount: 0,
    revision: 1,
    importBatchId: draft.importBatchId ?? '',
    deletedAt: ''
  }
}

async function ensureTags(tagNames: string[]): Promise<Tag[]> {
  const now = nowIso()
  const tags: Tag[] = []
  for (const rawName of tagNames) {
    const name = rawName.trim()
    const normalizedName = normalizeText(name)
    if (!normalizedName) continue
    let tag = await db.tags.where('normalizedName').equals(normalizedName).first()
    if (!tag) {
      tag = { id: uuid(), name, normalizedName, createdAt: now, updatedAt: now }
      await db.tags.add(tag)
    }
    tags.push(tag)
  }
  return tags
}

export async function createEntry(draft: EntryDraft): Promise<DictionaryEntry> {
  if (!draft.headword.trim()) throw new Error('見出し語を入力してください。')
  if (draft.headword.length > 10_000) throw new Error('見出し語は10,000文字以内で入力してください。')

  let created!: DictionaryEntry
  await db.transaction('rw', db.entries, db.tags, async () => {
    const tags = await ensureTags(draft.tagNames ?? [])
    created = createBaseEntry(draft, tags.map((tag) => tag.id))
    await db.entries.add(created)
  })
  notifyDatabaseChanged()
  return created
}


export async function createEntriesBatch(drafts: EntryDraft[]): Promise<DictionaryEntry[]> {
  const validDrafts = drafts.filter((draft) => draft.headword.trim())
  if (validDrafts.length === 0) return []
  if (validDrafts.length > 20_000) throw new Error('一度に取り込めるのは20,000件までです。')
  if (validDrafts.some((draft) => draft.headword.length > 10_000)) throw new Error('10,000文字を超える見出し語があります。')
  const created: DictionaryEntry[] = []
  await db.transaction('rw', db.entries, db.tags, async () => {
    for (const draft of validDrafts) {
      const tags = await ensureTags(draft.tagNames ?? [])
      const entry = createBaseEntry(draft, tags.map((tag) => tag.id))
      await db.entries.add(entry)
      created.push(entry)
    }
  })
  notifyDatabaseChanged()
  return created
}

export async function updateEntry(id: string, update: EntryUpdate): Promise<DictionaryEntry> {
  const current = await db.entries.get(id)
  if (!current) throw new Error('項目が見つかりません。')

  let tagIds = current.tagIds
  await db.transaction('rw', db.entries, db.tags, async () => {
    const { tagNames: _tagNames, ...entryUpdate } = update
    if (update.tagNames) {
      const tags = await ensureTags(update.tagNames)
      tagIds = tags.map((tag) => tag.id)
    }
    const nextHeadword = update.headword?.trim() ?? current.headword
    if (!nextHeadword) throw new Error('見出し語を入力してください。')
    await db.entries.update(id, {
      ...entryUpdate,
      headword: nextHeadword,
      normalizedHeadword: normalizeText(nextHeadword),
      reading: update.reading?.trim() ?? current.reading,
      normalizedReading: normalizeText(update.reading ?? current.reading),
      sourceUrl: safeHttpUrl(update.sourceUrl ?? current.sourceUrl),
      tagIds,
      updatedAt: nowIso(),
      revision: current.revision + 1
    })
  })
  notifyDatabaseChanged()
  return (await db.entries.get(id)) as DictionaryEntry
}

export async function softDeleteEntry(id: string): Promise<void> {
  await db.entries.update(id, { deletedAt: nowIso(), updatedAt: nowIso() })
  notifyDatabaseChanged()
}

export async function restoreEntry(id: string): Promise<void> {
  await db.entries.update(id, { deletedAt: '', updatedAt: nowIso() })
  notifyDatabaseChanged()
}

export async function permanentlyDeleteEntry(id: string): Promise<void> {
  await db.entries.delete(id)
  notifyDatabaseChanged()
}

export async function markEntryViewed(id: string): Promise<void> {
  const entry = await db.entries.get(id)
  if (!entry) return
  await db.entries.update(id, {
    lastViewedAt: nowIso(),
    viewCount: entry.viewCount + 1
  })
  notifyDatabaseChanged()
}

export async function markEntriesRandomShown(ids: string[]): Promise<void> {
  const now = nowIso()
  await db.transaction('rw', db.entries, async () => {
    for (const id of ids) {
      const entry = await db.entries.get(id)
      if (!entry) continue
      await db.entries.update(id, {
        randomShownAt: now,
        randomShownCount: entry.randomShownCount + 1
      })
    }
  })
  notifyDatabaseChanged()
}

export async function toggleFavorite(id: string): Promise<void> {
  const entry = await db.entries.get(id)
  if (!entry) return
  await db.entries.update(id, { favorite: !entry.favorite, updatedAt: nowIso() })
  notifyDatabaseChanged()
}

export async function getTagMap(): Promise<Map<string, Tag>> {
  const tags = await db.tags.toArray()
  return new Map(tags.map((tag) => [tag.id, tag]))
}
