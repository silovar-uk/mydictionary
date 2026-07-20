import { useState } from 'react'
import type { DictionaryEntry, EntryStatus, EntryType, SourceType, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS, SOURCE_TYPE_LABELS, STATUS_LABELS } from '../domain/types'
import { updateEntry } from '../services/entries'
import { Icon } from './Icon'
import { entryInputFromForm, entryToFormState } from './EntryFormFields'

export type EntryEditSection =
  | 'heading'
  | 'shortMeaning'
  | 'meaning'
  | 'encounter'
  | 'quotation'
  | 'source'
  | 'whySaved'
  | 'usageNotes'
  | 'examples'
  | 'tags'

interface Props {
  entry: DictionaryEntry
  tags: Tag[]
  section: EntryEditSection
  onClose: () => void
  onSaved: (entry: DictionaryEntry) => void
}

const LANGUAGE_LABELS: Record<DictionaryEntry['language'], string> = {
  ja: '日本語',
  en: '英語',
  ko: '韓国語',
  other: 'その他'
}

const SECTION_TITLES: Record<EntryEditSection, string> = {
  heading: '言葉の基本情報',
  shortMeaning: '一言での意味',
  meaning: '意味・解釈',
  encounter: '出会ったとき',
  quotation: '原文・引用',
  source: '出典',
  whySaved: 'なぜ気になったか',
  usageNotes: 'こんな時に使う',
  examples: '用例',
  tags: '索引・タグ'
}

export function EntryFieldEditor({ entry, tags, section, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => entryToFormState(entry, tags))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    if (!form.headword.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const saved = await updateEntry(entry.id, entryInputFromForm(form))
      onSaved(saved)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop entry-field-editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet entry-field-editor" role="dialog" aria-modal="true" aria-labelledby="entry-field-editor-title">
        <header className="sheet-header">
          <div>
            <div className="eyebrow">QUICK EDIT</div>
            <h2 id="entry-field-editor-title">{SECTION_TITLES[section]}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="閉じる"><Icon name="close" /></button>
        </header>

        <div className="entry-field-editor__fields">
          {section === 'heading' && (
            <>
              <label className="field field--wide"><span>見出し語</span><textarea autoFocus value={form.headword} onChange={(event) => set('headword', event.target.value)} rows={2} /></label>
              <label className="field"><span>読み</span><input value={form.reading} onChange={(event) => set('reading', event.target.value)} /></label>
              <label className="field"><span>種類</span><select value={form.entryType} onChange={(event) => set('entryType', event.target.value as EntryType)}>{Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="field"><span>言語</span><select value={form.language} onChange={(event) => set('language', event.target.value as DictionaryEntry['language'])}>{Object.entries(LANGUAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="field"><span>状態</span><select value={form.status} onChange={(event) => set('status', event.target.value as EntryStatus)}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </>
          )}

          {section === 'shortMeaning' && <label className="field field--wide"><span>一言での意味</span><input autoFocus value={form.shortMeaning} onChange={(event) => set('shortMeaning', event.target.value)} placeholder="一覧で見返したときに思い出せる一文" /></label>}
          {section === 'meaning' && <label className="field field--wide"><span>意味・自分なりの解釈</span><textarea autoFocus value={form.meaning} onChange={(event) => set('meaning', event.target.value)} rows={7} /></label>}

          {section === 'encounter' && (
            <>
              <label className="field"><span>出会った日</span><input autoFocus type="date" value={form.encounteredDate} onChange={(event) => set('encounteredDate', event.target.value)} /></label>
              <label className="field field--wide"><span>出会った場面</span><textarea value={form.encounterContext} onChange={(event) => set('encounterContext', event.target.value)} rows={6} /></label>
            </>
          )}

          {section === 'quotation' && <label className="field field--wide"><span>原文・引用</span><textarea autoFocus value={form.quotation} onChange={(event) => set('quotation', event.target.value)} rows={8} /></label>}

          {section === 'source' && (
            <>
              <label className="field"><span>出典種別</span><select autoFocus value={form.sourceType} onChange={(event) => set('sourceType', event.target.value as SourceType | '')}><option value="">未設定</option>{Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="field"><span>出典名</span><input value={form.sourceTitle} onChange={(event) => set('sourceTitle', event.target.value)} /></label>
              <label className="field"><span>著者・発言者</span><input value={form.sourceAuthor} onChange={(event) => set('sourceAuthor', event.target.value)} /></label>
              <label className="field"><span>ページ・時刻</span><input value={form.sourceLocator} onChange={(event) => set('sourceLocator', event.target.value)} /></label>
              <label className="field field--wide"><span>URL</span><input type="url" inputMode="url" value={form.sourceUrl} onChange={(event) => set('sourceUrl', event.target.value)} /></label>
            </>
          )}

          {section === 'whySaved' && <label className="field field--wide"><span>なぜ気になったか</span><textarea autoFocus value={form.whySaved} onChange={(event) => set('whySaved', event.target.value)} rows={7} /></label>}
          {section === 'usageNotes' && <label className="field field--wide"><span>こんな時に使う・使用上の注意</span><textarea autoFocus value={form.usageNotes} onChange={(event) => set('usageNotes', event.target.value)} rows={7} /></label>}
          {section === 'examples' && <label className="field field--wide"><span>用例 <small>1行に1件</small></span><textarea autoFocus value={form.examples} onChange={(event) => set('examples', event.target.value)} rows={8} /></label>}
          {section === 'tags' && <label className="field field--wide"><span>タグ</span><input autoFocus value={form.tags} onChange={(event) => set('tags', event.target.value)} placeholder="企画, 読書" /></label>}
        </div>

        {error && <p className="error-text entry-field-editor__error" role="alert">{error}</p>}
        <footer className="sheet-footer">
          <button className="button button--ghost" type="button" onClick={onClose}>キャンセル</button>
          <button className="button button--primary" type="button" onClick={() => void save()} disabled={saving || !form.headword.trim()}>{saving ? '保存中…' : 'この項目を保存'}</button>
        </footer>
      </section>
    </div>
  )
}
