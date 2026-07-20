import { useEffect, useRef, useState } from 'react'
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

const FORM_SECTIONS = [
  { id: 'word', number: '01', title: '言葉' },
  { id: 'meaning', number: '02', title: '意味' },
  { id: 'encounter', number: '03', title: '出会い' },
  { id: 'source', number: '04', title: '出典' },
  { id: 'usage', number: '05', title: '活用' }
] as const

type SectionId = (typeof FORM_SECTIONS)[number]['id']

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

function sectionHasContent(id: SectionId, value: EntryFormState): boolean {
  if (id === 'word') return Boolean(value.headword.trim() || value.reading.trim() || value.favorite || value.entryType !== 'word' || value.language !== 'ja' || value.status !== 'captured')
  if (id === 'meaning') return Boolean(value.shortMeaning.trim() || value.meaning.trim())
  if (id === 'encounter') return Boolean(value.encounteredDate || value.encounterContext.trim() || value.whySaved.trim())
  if (id === 'source') return Boolean(value.sourceType || value.sourceTitle.trim() || value.sourceAuthor.trim() || value.sourceUrl.trim() || value.sourceLocator.trim() || value.quotation.trim())
  return Boolean(value.usageNotes.trim() || value.examples.trim() || value.tags.trim())
}

interface Props {
  value: EntryFormState
  onChange: (next: EntryFormState) => void
  autoFocus?: boolean
  onSave?: () => void
  saving?: boolean
  saveDisabled?: boolean
}

interface SectionProps {
  id: SectionId
  number: string
  title: string
  description: string
  children: ReactNode
}

function EntryFormSection({ id, number, title, description, children }: SectionProps) {
  const sectionId = `entry-form-section-${id}`
  const headingId = `${sectionId}-heading`
  return (
    <section id={sectionId} data-entry-section={id} className="entry-form__section" aria-labelledby={headingId}>
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

export function EntryFormFields({ value, onChange, autoFocus = false, onSave, saving = false, saveDisabled = false }: Props) {
  const formRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({})
  const [activeSection, setActiveSection] = useState<SectionId>('word')

  function set<K extends keyof EntryFormState>(key: K, nextValue: EntryFormState[K]) {
    onChange({ ...value, [key]: nextValue })
  }

  function jumpToSection(id: SectionId) {
    setActiveSection(id)
    document.getElementById(`entry-form-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    let frame = 0

    const updateCurrentSection = () => {
      frame = 0
      const sections = FORM_SECTIONS
        .map(({ id }) => document.getElementById(`entry-form-section-${id}`))
        .filter((section): section is HTMLElement => Boolean(section))

      if (sections.length === 0) return

      const anchor = formRef.current?.closest('.sheet') ? 82 : 126
      let current = sections[0]
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= anchor) current = section
      }

      const lastSection = sections[sections.length - 1]
      if (lastSection.getBoundingClientRect().bottom <= window.innerHeight - 70) current = lastSection

      const nextId = current.dataset.entrySection as SectionId | undefined
      if (nextId) setActiveSection(nextId)
    }

    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateCurrentSection)
    }

    scheduleUpdate()
    document.addEventListener('scroll', scheduleUpdate, true)
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      document.removeEventListener('scroll', scheduleUpdate, true)
      window.removeEventListener('resize', scheduleUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const nav = navRef.current
    const tab = tabRefs.current[activeSection]
    if (!nav || !tab) return

    const targetLeft = tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [activeSection])

  return (
    <div ref={formRef} className="entry-form">
      <nav className="entry-form__nav" aria-label="入力項目の目次">
        <div ref={navRef} className="entry-form__nav-track">
          {FORM_SECTIONS.map((section) => {
            const hasContent = sectionHasContent(section.id, value)
            return (
              <button
                ref={(element) => { tabRefs.current[section.id] = element }}
                className={`entry-form__nav-button ${activeSection === section.id ? 'is-active' : ''} ${hasContent ? 'has-content' : ''}`}
                type="button"
                aria-label={`${section.title}${hasContent ? '、入力済み' : ''}`}
                aria-current={activeSection === section.id ? 'step' : undefined}
                onClick={() => jumpToSection(section.id)}
                key={section.id}
              >
                <span>{section.number}</span>
                <strong>{section.title}</strong>
                <span className="entry-form__nav-check" aria-hidden="true">✓</span>
              </button>
            )
          })}
        </div>
        {onSave && (
          <button
            className="entry-form__nav-save"
            type="button"
            onClick={onSave}
            disabled={saving || saveDisabled}
            aria-label="保存して辞典一覧へ"
          >
            {saving ? '保存中' : '保存'}
          </button>
        )}
      </nav>

      <EntryFormSection id="word" number="01" title="言葉" description="見出し語だけでも保存できる。読みや状態は必要なときに足す。">
        <label className="field entry-form__field--headword"><span>見出し語 <small>これだけで保存できます</small></span><textarea autoFocus={autoFocus} value={value.headword} onChange={(event) => set('headword', event.target.value)} rows={2} placeholder="気になった言葉や文章" /></label>
        <label className="check-field entry-form__field--favorite"><input type="checkbox" checked={value.favorite} onChange={(event) => set('favorite', event.target.checked)} /><span>お気に入り</span></label>
        <label className="field entry-form__field--quarter"><span>読み</span><input value={value.reading} onChange={(event) => set('reading', event.target.value)} placeholder="ひらがななど" /></label>
        <label className="field entry-form__field--quarter"><span>種類</span><select value={value.entryType} onChange={(event) => set('entryType', event.target.value as EntryType)}>{Object.entries(ENTRY_TYPE_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
        <label className="field entry-form__field--quarter"><span>言語</span><select value={value.language} onChange={(event) => set('language', event.target.value as DictionaryEntry['language'])}>{Object.entries(LANGUAGE_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
        <label className="field entry-form__field--quarter"><span>状態</span><select value={value.status} onChange={(event) => set('status', event.target.value as EntryStatus)}>{Object.entries(STATUS_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
      </EntryFormSection>

      <EntryFormSection id="meaning" number="02" title="意味" description="辞書の説明ではなく、自分がどう受け取ったかまで残す。">
        <label className="field field--wide entry-form__field--lead"><span>一言での意味</span><input value={value.shortMeaning} onChange={(event) => set('shortMeaning', event.target.value)} placeholder="一覧で見返したときに思い出せる一文" /></label>
        <label className="field field--wide"><span>詳しい意味・自分なりの解釈</span><textarea value={value.meaning} onChange={(event) => set('meaning', event.target.value)} rows={4} placeholder="意味、ニュアンス、似た言葉との違いなど" /></label>
      </EntryFormSection>

      <EntryFormSection id="encounter" number="03" title="出会い" description="なぜこの言葉が、その時の自分に引っかかったのかを残す。">
        <label className="field entry-form__field--third"><span>出会った日</span><input type="date" value={value.encounteredDate} onChange={(event) => set('encounteredDate', event.target.value)} /></label>
        <label className="field entry-form__field--two-thirds"><span>出会った場面</span><textarea value={value.encounterContext} onChange={(event) => set('encounterContext', event.target.value)} rows={3} placeholder="どこで、誰と、どんな状況で出会ったか" /></label>
        <label className="field field--wide"><span>なぜ気になったか</span><textarea value={value.whySaved} onChange={(event) => set('whySaved', event.target.value)} rows={3} placeholder="保存しようと思った理由や、その時の感情" /></label>
      </EntryFormSection>

      <EntryFormSection id="source" number="04" title="出典" description="あとから元の文脈へ戻れるだけの手がかりを残す。">
        <label className="field entry-form__field--quarter"><span>出典種別</span><select value={value.sourceType} onChange={(event) => set('sourceType', event.target.value as SourceType | '')}><option value="">未設定</option>{Object.entries(SOURCE_TYPE_LABELS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select></label>
        <label className="field entry-form__field--three-quarters"><span>出典名</span><input value={value.sourceTitle} onChange={(event) => set('sourceTitle', event.target.value)} placeholder="本・記事・番組・会話などの名前" /></label>
        <label className="field"><span>著者・発言者</span><input value={value.sourceAuthor} onChange={(event) => set('sourceAuthor', event.target.value)} /></label>
        <label className="field"><span>ページ・時刻</span><input value={value.sourceLocator} onChange={(event) => set('sourceLocator', event.target.value)} placeholder="p.24、12:35 など" /></label>
        <label className="field field--wide"><span>URL</span><input type="url" inputMode="url" value={value.sourceUrl} onChange={(event) => set('sourceUrl', event.target.value)} placeholder="https://" /></label>
        <label className="field field--wide"><span>原文・引用</span><textarea value={value.quotation} onChange={(event) => set('quotation', event.target.value)} rows={4} placeholder="忘れたくない原文を、そのまま残す" /></label>
      </EntryFormSection>

      <EntryFormSection id="usage" number="05" title="活用" description="自分の言葉として使う場面と、あとで探すための索引をつくる。">
        <label className="field"><span>こんな時に使う・使用上の注意</span><textarea value={value.usageNotes} onChange={(event) => set('usageNotes', event.target.value)} rows={4} placeholder="使える場面、使わない方がよい場面、ニュアンスなど" /></label>
        <label className="field"><span>例文 <small>1行に1件</small></span><textarea value={value.examples} onChange={(event) => set('examples', event.target.value)} rows={4} placeholder={'例文を一つずつ改行して入力\n二つ目の例文'} /></label>
        <label className="field field--wide"><span>タグ</span><input value={value.tags} onChange={(event) => set('tags', event.target.value)} placeholder="企画, 読書" /></label>
      </EntryFormSection>
    </div>
  )
}
