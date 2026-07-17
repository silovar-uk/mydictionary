import { db, notifyDatabaseChanged } from '../db/database'
import { normalizeText, splitTags } from '../domain/normalize'
import type { BackupFile, DictionaryEntry, EntryDraft, SettingRecord, Tag } from '../domain/types'
import { createEntriesBatch } from './entries'

const APP_VERSION = '0.1.0'

export async function createBackup(): Promise<BackupFile> {
  const [entries, tags, settings] = await Promise.all([
    db.entries.toArray(),
    db.tags.toArray(),
    db.settings.toArray()
  ])
  return {
    format: 'watashi-jiten-backup',
    formatVersion: 1,
    appVersion: APP_VERSION,
    databaseVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: { entries: entries.length, tags: tags.length },
    entries,
    tags,
    settings
  }
}

export function backupToJson(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function entriesToCsv(entries: DictionaryEntry[], tags: Tag[]): string {
  const tagMap = new Map(tags.map((tag) => [tag.id, tag.name]))
  const header = [
    'ID', '見出し語', '読み', '種類', '言語', '一言の意味', '詳しい意味', '出会った日',
    '出会った場面', '出典種別', '出典名', '著者・発言者', 'URL', '位置', '引用',
    '気になった理由', '使い方', '例文', 'タグ', '状態', 'お気に入り', '追加日', '更新日'
  ]
  const rows = entries.map((entry) => [
    entry.id,
    entry.headword,
    entry.reading,
    entry.entryType,
    entry.language,
    entry.shortMeaning,
    entry.meaning,
    entry.encounteredDate,
    entry.encounterContext,
    entry.sourceType,
    entry.sourceTitle,
    entry.sourceAuthor,
    entry.sourceUrl,
    entry.sourceLocator,
    entry.quotation,
    entry.whySaved,
    entry.usageNotes,
    entry.examples.join('｜'),
    entry.tagIds.map((id) => tagMap.get(id) ?? '').filter(Boolean).join('｜'),
    entry.status,
    entry.favorite ? '1' : '0',
    entry.createdAt,
    entry.updatedAt
  ])
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}

export function entriesToText(entries: DictionaryEntry[]): string {
  return entries.map((entry) => entry.headword).join('\n')
}

export async function downloadText(filename: string, content: string, type: string): Promise<void> {
  const file = new File([content], filename, { type })
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (navigator.share && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') console.error(error)
    }
  }
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}


export function validateBackup(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false
  const backup = value as Partial<BackupFile>
  if (backup.format !== 'watashi-jiten-backup' || backup.formatVersion !== 1) return false
  if (!Array.isArray(backup.entries) || !Array.isArray(backup.tags) || !Array.isArray(backup.settings)) return false
  return backup.entries.every((entry) =>
    Boolean(entry) &&
    typeof entry.id === 'string' &&
    typeof entry.headword === 'string' &&
    typeof entry.normalizedHeadword === 'string' &&
    Array.isArray(entry.tagIds)
  )
}

export async function restoreBackup(backup: BackupFile): Promise<void> {
  if (!validateBackup(backup)) {
    throw new Error('対応していない、または壊れているバックアップです。')
  }
  await db.transaction('rw', db.entries, db.tags, db.settings, async () => {
    await Promise.all([db.entries.clear(), db.tags.clear(), db.settings.clear()])
    await db.tags.bulkPut(backup.tags)
    await db.entries.bulkPut(backup.entries)
    await db.settings.bulkPut(backup.settings as SettingRecord[])
    const restoredCount = await db.entries.count()
    if (restoredCount !== backup.entries.length) throw new Error('復元件数が一致しません。')
  })
  notifyDatabaseChanged()
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell)
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function findColumn(header: string[], candidates: string[]): number {
  const normalizedCandidates = candidates.map(normalizeText)
  return header.findIndex((name) => normalizedCandidates.includes(normalizeText(name.replace(/^\uFEFF/, ''))))
}

export function csvToDrafts(text: string): EntryDraft[] {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return []
  const header = rows[0]
  const indexes = {
    headword: findColumn(header, ['見出し語', '言葉', 'word', 'term', 'title']),
    reading: findColumn(header, ['読み', 'よみ', 'reading']),
    shortMeaning: findColumn(header, ['一言の意味', '意味', 'meaning', 'definition']),
    meaning: findColumn(header, ['詳しい意味', '詳細', 'description']),
    sourceTitle: findColumn(header, ['出典名', '出典', 'source']),
    sourceUrl: findColumn(header, ['URL', 'link']),
    encounteredDate: findColumn(header, ['出会った日', 'date', '登録日']),
    tags: findColumn(header, ['タグ', 'tag', 'tags']),
    memo: findColumn(header, ['メモ', 'memo', 'note'])
  }
  if (indexes.headword < 0) throw new Error('見出し語に当たる列が見つかりません。')
  return rows.slice(1).flatMap((row) => {
    const headword = row[indexes.headword]?.trim()
    if (!headword) return []
    return [{
      headword,
      reading: indexes.reading >= 0 ? row[indexes.reading] : '',
      shortMeaning: indexes.shortMeaning >= 0 ? row[indexes.shortMeaning] : '',
      meaning: indexes.meaning >= 0 ? row[indexes.meaning] : '',
      sourceTitle: indexes.sourceTitle >= 0 ? row[indexes.sourceTitle] : '',
      sourceUrl: indexes.sourceUrl >= 0 ? row[indexes.sourceUrl] : '',
      encounteredDate: indexes.encounteredDate >= 0 ? row[indexes.encounteredDate] : '',
      whySaved: indexes.memo >= 0 ? row[indexes.memo] : '',
      tagNames: indexes.tags >= 0 ? splitTags(row[indexes.tags].replace(/｜/g, ',')) : []
    } satisfies EntryDraft]
  })
}

export function textToDrafts(text: string): EntryDraft[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [headword, shortMeaning = '', tags = ''] = line.split('｜')
      return { headword: headword.trim(), shortMeaning: shortMeaning.trim(), tagNames: splitTags(tags) }
    })
}

export async function importDrafts(drafts: EntryDraft[]): Promise<number> {
  const batchId = crypto.randomUUID()
  const created = await createEntriesBatch(drafts.map((draft) => ({ ...draft, importBatchId: batchId })))
  return created.length
}

export function countDuplicateDrafts(drafts: EntryDraft[], entries: DictionaryEntry[]): number {
  const existing = new Set(entries.map((entry) => entry.normalizedHeadword))
  const withinFile = new Set<string>()
  let duplicates = 0
  for (const draft of drafts) {
    const normalized = normalizeText(draft.headword)
    if (!normalized) continue
    if (existing.has(normalized) || withinFile.has(normalized)) duplicates += 1
    withinFile.add(normalized)
  }
  return duplicates
}
