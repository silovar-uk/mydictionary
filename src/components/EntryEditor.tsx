import { useMemo, useState } from 'react'
import type { DictionaryEntry, EntryType, EntryStatus, SourceType, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS, SOURCE_TYPE_LABELS, STATUS_LABELS } from '../domain/types'
import { splitTags } from '../domain/normalize'
import { updateEntry } from '../services/entries'
import { Icon } from './Icon'

interface Props {
  entry: DictionaryEntry
  tags: Tag[]
  onClose: () => void
  onSaved: (entry: DictionaryEntry) => void
}

export function EntryEditor({ entry, tags, onClose, onSaved }: Props) {
  const initialTags = useMemo(() => entry.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name).filter(Boolean).join(', '), [entry, tags])
  const [form, setForm] = useState({
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
    tags: initialTags,
    status: entry.status,
    favorite: entry.favorite
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const saved = await updateEntry(entry.id, {
        ...form,
        sourceType: form.sourceType as SourceType | '',
        examples: form.examples.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
        tagNames: splitTags(form.tags)
      })
      onSaved(saved)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet sheet--editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="sheet-header">
          <div>
            <div className="eyebrow">EDIT ENTRY</div>
            <h2 id="editor-title">辞書項目を育てる</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="閉じる"><Icon name="close" /></button>
        </header>
        <div className="editor-grid">
          <label className="field field--wide"><span>見出し語</span><textarea value={form.headword} onChange={(e) => set('headword', e.target.value)} rows={2} /></label>
          <label className="field"><span>読み</span><input value={form.reading} onChange={(e) => set('reading', e.target.value)} /></label>
          <label className="field"><span>種類</span><select value={form.entryType} onChange={(e) => set('entryType', e.target.value as EntryType)}>{Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field field--wide"><span>一言での意味</span><input value={form.shortMeaning} onChange={(e) => set('shortMeaning', e.target.value)} /></label>
          <label className="field field--wide"><span>詳しい意味・自分なりの解釈</span><textarea value={form.meaning} onChange={(e) => set('meaning', e.target.value)} rows={5} /></label>
          <label className="field"><span>出会った日</span><input type="date" value={form.encounteredDate} onChange={(e) => set('encounteredDate', e.target.value)} /></label>
          <label className="field"><span>状態</span><select value={form.status} onChange={(e) => set('status', e.target.value as EntryStatus)}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field field--wide"><span>出会った場面</span><textarea value={form.encounterContext} onChange={(e) => set('encounterContext', e.target.value)} rows={3} /></label>
          <label className="field"><span>出典種別</span><select value={form.sourceType} onChange={(e) => set('sourceType', e.target.value as SourceType | '')}><option value="">未設定</option>{Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>出典名</span><input value={form.sourceTitle} onChange={(e) => set('sourceTitle', e.target.value)} /></label>
          <label className="field"><span>著者・発言者</span><input value={form.sourceAuthor} onChange={(e) => set('sourceAuthor', e.target.value)} /></label>
          <label className="field"><span>ページ・時刻</span><input value={form.sourceLocator} onChange={(e) => set('sourceLocator', e.target.value)} /></label>
          <label className="field field--wide"><span>URL</span><input type="url" value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} /></label>
          <label className="field field--wide"><span>原文・引用</span><textarea value={form.quotation} onChange={(e) => set('quotation', e.target.value)} rows={5} /></label>
          <label className="field field--wide"><span>なぜ気になったか</span><textarea value={form.whySaved} onChange={(e) => set('whySaved', e.target.value)} rows={3} /></label>
          <label className="field field--wide"><span>こんな時に使う・使用上の注意</span><textarea value={form.usageNotes} onChange={(e) => set('usageNotes', e.target.value)} rows={4} /></label>
          <label className="field field--wide"><span>例文 <small>1行に1件</small></span><textarea value={form.examples} onChange={(e) => set('examples', e.target.value)} rows={4} /></label>
          <label className="field field--wide"><span>タグ</span><input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="企画, 読書" /></label>
          <label className="check-field field--wide"><input type="checkbox" checked={form.favorite} onChange={(e) => set('favorite', e.target.checked)} /><span>お気に入りにする</span></label>
        </div>
        {error && <p className="error-text">{error}</p>}
        <footer className="sheet-footer">
          <button className="button button--ghost" type="button" onClick={onClose}>閉じる</button>
          <button className="button button--primary" type="button" onClick={() => void save()} disabled={saving || !form.headword.trim()}>{saving ? '保存中…' : '保存する'}</button>
        </footer>
      </section>
    </div>
  )
}
