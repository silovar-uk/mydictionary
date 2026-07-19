import { describe, expect, it } from 'vitest'
import type { DictionaryEntry } from '../src/domain/types'
import { filterDuplicateNotionDrafts, notionCsvToDrafts } from '../src/services/notionImport'

const existingEntry: DictionaryEntry = {
  id: 'entry-1',
  headword: '好奇心とは資産である',
  normalizedHeadword: '好奇心とは資産である',
  reading: '',
  normalizedReading: '',
  entryType: 'quote',
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
  createdAt: '',
  updatedAt: '',
  lastViewedAt: '',
  viewCount: 0,
  randomShownAt: '',
  randomShownCount: 0,
  revision: 1,
  importBatchId: '',
  deletedAt: ''
}

describe('Notion CSV import', () => {
  it('maps Quoteメモ while preserving source and original date', () => {
    const csv = [
      'Name,Tags,元コンテンツ,URL,Created',
      '"好奇心とは資産である","気づき,定義","読書という荒野",https://example.com,2022-07-17T01:31:00.000Z'
    ].join('\n')

    const result = notionCsvToDrafts(csv, 'Quoteメモ.csv', { includeContentRecords: false })

    expect(result.kind).toBe('quote')
    expect(result.drafts[0]).toMatchObject({
      headword: '好奇心とは資産である',
      entryType: 'quote',
      quotation: '好奇心とは資産である',
      sourceTitle: '読書という荒野',
      sourceUrl: 'https://example.com',
      encounteredDate: '2022-07-17',
      createdAt: '2022-07-17T01:31:00.000Z',
      tagNames: ['Quoteメモ', '気づき', '定義']
    })
  })

  it('keeps reading/content rows optional and maps favorites and genres', () => {
    const csv = [
      'Name,ジャンル,URL,きっかけ,殿堂入り,Created',
      'テスカトリポカ,"小説,歴史",https://example.com,友人の紹介,TRUE,2026-07-14T14:27:02.116Z'
    ].join('\n')

    const ignored = notionCsvToDrafts(csv, '読書・コンテンツ.csv', { includeContentRecords: false })
    expect(ignored.kind).toBe('content')
    expect(ignored.drafts).toHaveLength(0)
    expect(ignored.ignoredRows).toBe(1)

    const included = notionCsvToDrafts(csv, '読書・コンテンツ.csv', { includeContentRecords: true })
    expect(included.drafts[0]).toMatchObject({
      headword: 'テスカトリポカ',
      entryType: 'proper_noun',
      sourceType: 'book',
      encounterContext: '友人の紹介',
      favorite: true,
      tagNames: ['読書・コンテンツ', '小説', '歴史']
    })
  })

  it('removes duplicates inside the import and against existing entries', () => {
    const drafts = [
      { headword: '好奇心とは資産である' },
      { headword: '偶然を設計する' },
      { headword: '偶然を設計する' }
    ]
    const result = filterDuplicateNotionDrafts(drafts, [existingEntry])

    expect(result.skipped).toBe(2)
    expect(result.drafts.map((draft) => draft.headword)).toEqual(['偶然を設計する'])
  })
})
