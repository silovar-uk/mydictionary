import { describe, expect, it } from 'vitest'
import { csvToDrafts, entriesToCsv, textToDrafts, validateBackup } from '../src/services/transfer'
import type { DictionaryEntry, Tag } from '../src/domain/types'

const tag: Tag = { id: 'tag-1', name: '企画', normalizedName: '企画', createdAt: '', updatedAt: '' }
const entry: DictionaryEntry = {
  id: 'entry-1', headword: '=危険な数式', normalizedHeadword: '=危険な数式', reading: '', normalizedReading: '',
  entryType: 'phrase', language: 'ja', shortMeaning: '一言', meaning: '', encounteredDate: '', encounterContext: '',
  sourceType: '', sourceTitle: '', sourceAuthor: '', sourceUrl: '', sourceLocator: '', quotation: '', whySaved: '', usageNotes: '',
  examples: [], tagIds: ['tag-1'], status: 'captured', favorite: false, createdAt: '', updatedAt: '', lastViewedAt: '', viewCount: 0,
  randomShownAt: '', randomShownCount: 0, revision: 1, importBatchId: '', deletedAt: ''
}

describe('transfer', () => {
  it('protects CSV cells from formula execution', () => {
    expect(entriesToCsv([entry], [tag])).toContain("'=危険な数式")
  })

  it('maps common CSV headings', () => {
    const drafts = csvToDrafts('見出し語,意味,タグ\n偶然を設計する,再会をつくる,企画｜言葉')
    expect(drafts[0]).toMatchObject({ headword: '偶然を設計する', shortMeaning: '再会をつくる', tagNames: ['企画', '言葉'] })
  })

  it('rejects malformed backup data', () => {
    expect(validateBackup({ format: 'watashi-jiten-backup', formatVersion: 1, entries: 'broken' })).toBe(false)
  })

  it('imports lightweight pipe-delimited text', () => {
    expect(textToDrafts('言葉｜メモ｜企画,読書')[0]).toMatchObject({ headword: '言葉', shortMeaning: 'メモ', tagNames: ['企画', '読書'] })
  })
})
