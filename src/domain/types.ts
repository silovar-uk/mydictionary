export type EntryType =
  | 'word'
  | 'phrase'
  | 'sentence'
  | 'quote'
  | 'concept'
  | 'proper_noun'
  | 'coined_word'

export type EntryStatus = 'captured' | 'growing' | 'owned'

export type SourceType =
  | 'book'
  | 'web'
  | 'social'
  | 'conversation'
  | 'movie'
  | 'comic'
  | 'anime'
  | 'work'
  | 'street'
  | 'other'

export interface DictionaryEntry {
  id: string
  headword: string
  normalizedHeadword: string
  reading: string
  normalizedReading: string
  entryType: EntryType
  language: 'ja' | 'en' | 'ko' | 'other'
  shortMeaning: string
  meaning: string
  encounteredDate: string
  encounterContext: string
  sourceType: SourceType | ''
  sourceTitle: string
  sourceAuthor: string
  sourceUrl: string
  sourceLocator: string
  quotation: string
  whySaved: string
  usageNotes: string
  examples: string[]
  tagIds: string[]
  status: EntryStatus
  favorite: boolean
  createdAt: string
  updatedAt: string
  lastViewedAt: string
  viewCount: number
  randomShownAt: string
  randomShownCount: number
  revision: number
  importBatchId: string
  deletedAt: string
}

export interface Tag {
  id: string
  name: string
  normalizedName: string
  createdAt: string
  updatedAt: string
}

export interface SettingRecord {
  key: string
  value: unknown
}

export type EntryDraft = Pick<DictionaryEntry, 'headword'> &
  Partial<Omit<DictionaryEntry, 'id' | 'headword' | 'normalizedHeadword' | 'createdAt' | 'updatedAt' | 'revision'>> & {
    tagNames?: string[]
  }

export type EntryUpdate = Partial<Omit<DictionaryEntry, 'id' | 'createdAt' | 'revision'>> & {
  tagNames?: string[]
}

export type DiscoveryMode = 'thoughtful' | 'random' | 'unseen' | 'dormant' | 'growing' | 'favorite'

export interface BackupFile {
  format: 'watashi-jiten-backup'
  formatVersion: 1
  appVersion: string
  databaseVersion: 1
  exportedAt: string
  counts: {
    entries: number
    tags: number
  }
  entries: DictionaryEntry[]
  tags: Tag[]
  settings: SettingRecord[]
}

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  word: '単語',
  phrase: 'フレーズ',
  sentence: '文章',
  quote: '引用',
  concept: '概念',
  proper_noun: '固有名詞',
  coined_word: '自作語'
}

export const STATUS_LABELS: Record<EntryStatus, string> = {
  captured: '拾った',
  growing: '育て中',
  owned: '自分の言葉'
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  book: '本',
  web: 'Web',
  social: 'SNS',
  conversation: '会話',
  movie: '映画',
  comic: '漫画',
  anime: 'アニメ',
  work: '仕事',
  street: '街中',
  other: 'その他'
}
