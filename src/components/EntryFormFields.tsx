import type { ReactNode } from 'react'
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

const LANGUAGE_LABELS: Record<DictionaryEntry['language'], string> = {
  ja: '日本語',
  en: '英語',
  ko: '韓国語',
  other: 'その他'
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

interface SectionProps {
  number: string
  title: string
  description: string
  children: ReactNode
}

function EntryFormSection({ number, title, description, children }: SectionProps) {
  const headingId = `entry-form-section-${number}`
  return (
    <section className="entry-form__section" aria-labelledby={headingId}>
      <header className="entry-form__section-header">
        <span className="entry-form__section-number" aria-hidden="true">{number}</span>
        <div>
          <h3 id={headingId}>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      <div className="entry-form__grid">{children}</div>
    </section>
  )
}

export function EntryFormFields({ value, onChange, autoFocus = false }: Props) {
  function set<K extends keyof EntryFormState>(key: K, nextValue: EntryFormState[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="entry-form">
      <EntryFormSection number="01" title="言葉" description="辞典の見出しと、いまの育ち具合を記録する。">
        <label className="field field--wide entry-form__field--primary"><span>見出し語</span><textarea autoFocus={autoFocus} value={value.headword} onChange={(event) => set('headword', event.target.value)} rows={2} placeholder="気になった言葉や文章" /></label>
        <label className="field"><span>読み</span><input value={value.reading} onChange={(event) => set('reading', event.target.value)} placeholder="ひらがな・カタカナなど" /></label>
        <label className="field"><span>種類</span><select value={value.entryType} onChange={(event) => set('entryType', event.target.value as EntryType)}>{Object.entries(ENTRY_TYPE_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
        <label className="field"><span>言語</span><select value={value.language} onChange={(event) => set('language', event.target.value as DictionaryEntry['language'])}>{Object.entries(LANGUAGE_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
        <label className="field"><span>状態</span><select value={value.status} onChange={(event) => set('status', event.target.value as EntryStatus)}>{Object.entries(STATUS_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
        <label className="check-field field--wide"><input type="checkbox" checked={value.favorite} onChange={(event) => set('favorite', event.target.checked)} /><span>お気に入りにする</span></label>
      </EntryFormSection>

      <EntryFormSection number="02" title="意味" description="辞書の説明ではなく、自分がどう受け取ったかまで残す。">
        <label className="field field--wide entry-form__field--lead"><span>一言での意味</span><input value={value.shortMeaning} onChange={(event) => set('shortMeaning', event.target.value)} placeholder="一覧で見返したときに思い出せる一文" /></label>
        <label className="field field--wide"><span>詳しい意味・自分なりの解釈</span><textarea value={value.meaning} onChange={(event) => set('meaning', event.target.value)} rows={6} placeholder="意味、ニュアンス、似た言葉との違いなど" /></label>
      </EntryFormSection>

      <EntryFormSection number="03" title="出会い" description="なぜこの言葉が、その時の自分に引っかかったのかを残す。">
        <label className="field"><span>出会った日</span><input type="date" value={value.encounteredDate} onChange={(event) => set('encounteredDate', event.target.value)} /></label>
        <div className="entry-form__spacer" aria-hidden="true" />
        <label className="field field--wide"><span>出会った場面</span><textarea value={value.encounterContext} onChange={(event) => set('encounterContext', event.target.value)} rows={4} placeholder="どこで、誰と、どんな状況で出会ったか" /></label>
        <label className="field field--wide"><span>なぜ気になったか</span><textarea value={value.whySaved} onChange={(event) => set('whySaved', event.target.value)} rows={4} placeholder="保存しようと思った理由や、その時の感情" /></label>
      </EntryFormSection>

      <EntryFormSection number="04" title="出典" description="あとから元の文脈へ戻れるだけの手がかりを残す。">
        <label className="field"><span>出典種別</span><select value={value.sourceType} onChange={(event) => set('sourceType', event.target.value as SourceType | '')}><option value="">未設定</option>{Object.entries(SOURCE_TYPE_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
        <label className="field"><span>出典名</span><input value={value.sourceTitle} onChange={(event) => set('sourceTitle', event.target.value)} placeholder="本・記事・番組・会話などの名前" /></label>
        <label className="field"><span>著者・発言者</span><input value={value.sourceAuthor} onChange={(event) => set('sourceAuthor', event.target.value)} /></label>
        <label className="field"><span>ページ・時刻</span><input value={value.sourceLocator} onChange={(event) => set('sourceLocator', event.target.value)} placeholder="p.24、12:35 など" /></label>
        <label className="field field--wide"><span>URL</span><input type="url" inputMode="url" value={value.sourceUrl} onChange={(event) => set('sourceUrl', event.target.value)} placeholder="https://" /></label>
        <label className="field field--wide"><span>原文・引用</span><textarea value={value.quotation} onChange={(event) => set('quotation', event.target.value)} rows={6} placeholder="忘れたくない原文を、そのまま残す" /></label>
      </EntryFormSection>

      <EntryFormSection number="05" title="活用" description="自分の言葉として使う場面と、あとで探すための索引をつくる。">
        <label className="field field--wide"><span>こんな時に使う・使用上の注意</span><textarea value={value.usageNotes} onChange={(event) => set('usageNotes', event.target.value)} rows={5} placeholder="使える場面、使わない方がよい場面、ニュアンスなど" /></label>
        <label className="field field--wide"><span>例文 <small>1行に1件</small></span><textarea value={value.examples} onChange={(event) => set('examples', event.target.value)} rows={5} placeholder={'例文を一つずつ改行して入力\n二つ目の例文'} /></label>
        <label className="field field--wide"><span>タグ</span><input value={value.tags} onChange={(event) => set('tags', event.target.value)} placeholder="企画, 読書" /></label>
      </EntryFormSection>
    </div>
  )
}
