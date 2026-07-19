import { normalizeText, splitTags } from '../domain/normalize'
import type { DictionaryEntry, EntryDraft, SourceType } from '../domain/types'

export type NotionDatasetKind = 'quote' | 'keyword' | 'content' | 'unknown'

export interface NotionImportOptions {
  includeContentRecords: boolean
}

export interface NotionImportResult {
  fileName: string
  kind: NotionDatasetKind
  drafts: EntryDraft[]
  ignoredRows: number
}

export interface DuplicateFilterResult {
  drafts: EntryDraft[]
  skipped: number
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
      if (row.some((value) => value.trim().length > 0)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  if (row.some((value) => value.trim().length > 0)) rows.push(row)
  return rows
}

function normalizedHeader(value: string): string {
  return normalizeText(value.replace(/^\uFEFF/, ''))
}

function findColumn(header: string[], candidates: string[]): number {
  const normalizedCandidates = candidates.map(normalizeText)
  return header.findIndex((name) => normalizedCandidates.includes(normalizedHeader(name)))
}

function findColumnContaining(header: string[], candidates: string[]): number {
  const normalizedCandidates = candidates.map(normalizeText)
  return header.findIndex((name) => {
    const normalized = normalizedHeader(name)
    return normalizedCandidates.some((candidate) => normalized.includes(candidate))
  })
}

function cell(row: string[], index: number): string {
  return index >= 0 ? (row[index] ?? '').trim() : ''
}

function parseJsonStringArray(value: string): string[] | null {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[')) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return null
  }
}

function parseMultiValue(value: string): string[] {
  const jsonValues = parseJsonStringArray(value)
  const source = jsonValues ? jsonValues.join(',') : value
  return splitTags(source.replace(/[｜|;；]/g, ','))
}

function cleanRelation(value: string): string {
  const values = parseJsonStringArray(value)
  if (values) return values.join('、')
  return value.trim()
}

function parseDate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const timestamp = Date.parse(trimmed)
  if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString()

  const matched = trimmed.match(/(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})日?/) 
  if (!matched) return ''
  const [, year, month, day] = matched
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function dateOnly(value: string): string {
  const parsed = parseDate(value)
  return parsed ? parsed.slice(0, 10) : ''
}

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'y', 'on', 'checked', '__yes__', 'はい'].includes(normalizeText(value))
}

function detectKind(fileName: string, header: string[]): NotionDatasetKind {
  const normalizedFileName = normalizeText(fileName)
  const normalizedHeaders = header.map(normalizedHeader)

  if (normalizedFileName.includes('quote') || normalizedFileName.includes('引用')) return 'quote'
  if (normalizedFileName.includes('キーワード') || normalizedFileName.includes('keyword')) return 'keyword'
  if (normalizedFileName.includes('読書') || normalizedFileName.includes('コンテンツ') || normalizedFileName.includes('content')) return 'content'

  if (normalizedHeaders.some((name) => name.includes('ジャンル') || name.includes('殿堂入り') || name.includes('借りたい'))) return 'content'
  if (normalizedHeaders.some((name) => name.includes('元コンテンツ')) && normalizedHeaders.some((name) => name === 'tags')) return 'quote'
  if (normalizedHeaders.some((name) => name.includes('キーワード'))) return 'keyword'
  return 'unknown'
}

function inferContentSourceType(tags: string[]): SourceType | '' {
  const normalized = tags.map(normalizeText)
  if (normalized.some((tag) => tag.includes('本') || tag.includes('小説') || tag.includes('エッセイ') || tag.includes('実用'))) return 'book'
  if (normalized.some((tag) => tag.includes('映画') || tag.includes('ドキュメンタリー'))) return 'movie'
  if (normalized.some((tag) => tag.includes('アニメ'))) return 'anime'
  if (normalized.some((tag) => tag.includes('漫画') || tag.includes('マンガ'))) return 'comic'
  return ''
}

function sourceRelationIndex(header: string[]): number {
  const exact = findColumn(header, [
    '元コンテンツ',
    '読書・コンテンツ',
    'コンテンツ',
    '出典',
    'source'
  ])
  if (exact >= 0) return exact
  return findColumnContaining(header, ['元コンテンツ', '読書・コンテンツとのリレーション', 'コンテンツとのリレーション'])
}

export function notionCsvToDrafts(
  text: string,
  fileName: string,
  options: NotionImportOptions
): NotionImportResult {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return { fileName, kind: 'unknown', drafts: [], ignoredRows: 0 }

  const header = rows[0]
  const kind = detectKind(fileName, header)
  const indexes = {
    name: findColumn(header, ['Name', '名前', 'タイトル', '見出し語']),
    created: findColumn(header, ['Created', '作成日時', '作成日', '登録日']),
    updated: findColumn(header, ['最終更新日時', 'Last edited time', 'Updated', '更新日']),
    url: findColumn(header, ['URL', 'userDefined:URL', 'link', 'リンク']),
    tags: findColumn(header, kind === 'content' ? ['ジャンル', 'Tags', 'タグ'] : ['Tags', 'タグ', 'ジャンル']),
    trigger: findColumn(header, ['きっかけ', '気になった理由', 'メモ', 'note']),
    favorite: findColumn(header, ['殿堂入り', 'お気に入り', 'Favorite']),
    source: sourceRelationIndex(header)
  }

  if (indexes.name < 0) return { fileName, kind, drafts: [], ignoredRows: rows.length - 1 }

  const drafts: EntryDraft[] = []
  let ignoredRows = 0

  for (const row of rows.slice(1)) {
    const headword = cell(row, indexes.name)
    if (!headword) {
      ignoredRows += 1
      continue
    }

    if (kind === 'content' && !options.includeContentRecords) {
      ignoredRows += 1
      continue
    }

    const tags = parseMultiValue(cell(row, indexes.tags))
    const sourceTitle = cleanRelation(cell(row, indexes.source))
    const sourceUrl = cell(row, indexes.url)
    const trigger = cell(row, indexes.trigger)
    const createdAt = parseDate(cell(row, indexes.created))
    const updatedAt = parseDate(cell(row, indexes.updated)) || createdAt
    const encounteredDate = dateOnly(cell(row, indexes.created))

    if (kind === 'quote') {
      drafts.push({
        headword,
        entryType: 'quote',
        quotation: headword,
        sourceTitle,
        sourceUrl,
        sourceType: sourceUrl ? 'web' : '',
        encounteredDate,
        whySaved: trigger,
        tagNames: ['Quoteメモ', ...tags],
        createdAt,
        updatedAt
      })
      continue
    }

    if (kind === 'keyword') {
      drafts.push({
        headword,
        entryType: 'concept',
        sourceTitle,
        sourceUrl,
        sourceType: sourceUrl ? 'web' : '',
        encounteredDate,
        whySaved: trigger,
        tagNames: ['キーワード', ...tags],
        createdAt,
        updatedAt
      })
      continue
    }

    if (kind === 'content') {
      drafts.push({
        headword,
        entryType: 'proper_noun',
        sourceType: inferContentSourceType(tags),
        sourceUrl,
        encounteredDate,
        encounterContext: trigger,
        whySaved: trigger,
        favorite: parseBoolean(cell(row, indexes.favorite)),
        tagNames: ['読書・コンテンツ', ...tags],
        createdAt,
        updatedAt
      })
      continue
    }

    drafts.push({
      headword,
      sourceTitle,
      sourceUrl,
      encounteredDate,
      whySaved: trigger,
      tagNames: tags,
      createdAt,
      updatedAt
    })
  }

  return { fileName, kind, drafts, ignoredRows }
}

export function filterDuplicateNotionDrafts(
  drafts: EntryDraft[],
  entries: DictionaryEntry[]
): DuplicateFilterResult {
  const seen = new Set(entries.map((entry) => entry.normalizedHeadword))
  const unique: EntryDraft[] = []
  let skipped = 0

  for (const draft of drafts) {
    const normalized = normalizeText(draft.headword)
    if (!normalized || seen.has(normalized)) {
      skipped += 1
      continue
    }
    seen.add(normalized)
    unique.push(draft)
  }

  return { drafts: unique, skipped }
}
