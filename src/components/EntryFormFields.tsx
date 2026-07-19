import type { DictionaryEntry, EntryStatus, EntryType, SourceType, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS, SOURCE_TYPE_LABELS, STATUS_LABELS } from '../domain/types'
import { splitTags } from '../domain/normalize'

export interface EntryFormState {
  headword: string
  reading: string
  entryType: EntryType
  language: DictionaryEntry['language']
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
  examples: string
  tags: string
  status: EntryStatus
  favorite: boolean
}

export function emptyEntryFormState(): EntryFormState {
  return {
    headword: '',
    reading: '',
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
    examples: '',
    tags: '',
    status: 'captured',
    favorite: false
  }
}

export function entryToFormState(entry: DictionaryEntry, tags: Tag[]): EntryFormState {
  return {
    headword: entry.headword,
    reading: entry.reading,
    entryType: entry.entryType,
    language: entry.language,
    shortMeaning: entry.shortMeaning,
    meaning: entry.meaning,
    encounteredDate: entry.encounteredDate,
    encounterContext: entry.encounterContext,
    sourceType: entry.sourceType,
    sourceTitle: entry.sourceTitle,
    sourceAuthor: entry.sourceAuthor,
    sourceUrl: entry.sourceUrl,
    sourceLocator: entry.sourceLocator,
    quotation: entry.quotation,
    whySaved: entry.whySaved,
    usageNotes: entry.usageNotes,
    examples: entry.examples.join('\n'),
    tags: entry.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name).filter(Boolean).join(', '),
    status: entry.status,
    favorite: entry.favorite
  }
}

export function entryInputFromForm(form: EntryFormState) {
  const { tags, examples, ...entryFields } = form
  return {
    ...entryFields,
    sourceType: form.sourceType as SourceType | '',
    examples: examples.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
    tagNames: splitTags(tags)
  }
}

interface Props {
  value: EntryFormState
  onChange: (next: EntryFormState) => void
  autoFocus?: boolean
}

export function EntryFormFields({ value, onChange, autoFocus = false }: Props) {
  function set<K extends keyof EntryFormState>(key: K, nextValue: EntryFormState[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="editor-grid">
      <label className="field field--wide"><span>見出し語</span><textarea autoFocus={autoFocus} value={value.headword} onChange={(event) => set('headword', event.target.value)} rows={2} placeholder="気になった言葉や文章" /></label>
      <label className="field"><span>読み</span><input value={value.reading} onChange={(event) => set('reading', event.target.value)} /></label>
      <label className="field"><span>種類</span><select value={value.entryType} onChange={(event) => set('entryType', event.target.value as EntryType)}>{Object.entries(ENTRY_TYPE_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
      <label className="field field--wide"><span>一言での意味</span><input value={value.shortMeaning} onChange={(event) => set('shortMeaning', event.target.value)} /></label>
      <label className="field field--wide"><span>詳しい意味・自分なりの解釈</span><textarea value={value.meaning} onChange={(event) => set('meaning', event.target.value)} rows={5} /></label>
      <label className="field"><span>出会った日</span><input type="date" value={value.encounteredDate} onChange={(event) => set('encounteredDate', event.target.value)} /></label>
      <label className="field"><span>状態</span><select value={value.status} onChange={(event) => set('status', event.target.value as EntryStatus)}>{Object.entries(STATUS_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
      <label className="field field--wide"><span>出会った場面</span><textarea value={value.encounterContext} onChange={(event) => set('encounterContext', event.target.value)} rows={3} /></label>
      <label className="field"><span>出典種別</span><select value={value.sourceType} onChange={(event) => set('sourceType', event.target.value as SourceType | '')}><option value="">未設定</option>{Object.entries(SOURCE_TYPE_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
      <label className="field"><span>出典名</span><input value={value.sourceTitle} onChange={(event) => set('sourceTitle', event.target.value)} /></label>
      <label className="field"><span>著者・発言者</span><input value={value.sourceAuthor} onChange={(event) => set('sourceAuthor', event.target.value)} /></label>
      <label className="field"><span>ページ・時刻</span><input value={value.sourceLocator} onChange={(event) => set('sourceLocator', event.target.value)} /></label>
      <label className="field field--wide"><span>URL</span><input type="url" value={value.sourceUrl} onChange={(event) => set('sourceUrl', event.target.value)} /></label>
      <label className="field field--wide"><span>原文・引用</span><textarea value={value.quotation} onChange={(event) => set('quotation', event.target.value)} rows={5} /></label>
      <label className="field field--wide"><span>なぜ気になったか</span><textarea value={value.whySaved} onChange={(event) => set('whySaved', event.target.value)} rows={3} /></label>
      <label className="field field--wide"><span>こんな時に使う・使用上の注意</span><textarea value={value.usageNotes} onChange={(event) => set('usageNotes', event.target.value)} rows={4} /></label>
      <label className="field field--wide"><span>例文 <small>1行に1件</small></span><textarea value={value.examples} onChange={(event) => set('examples', event.target.value)} rows={4} /></label>
      <label className="field field--wide"><span>タグ</span><input value={value.tags} onChange={(event) => set('tags', event.target.value)} placeholder="企画, 読書" /></label>
      <label className="check-field field--wide"><input type="checkbox" checked={value.favorite} onChange={(event) => set('favorite', event.target.checked)} /><span>お気に入りにする</span></label>
    </div>
  )
}
