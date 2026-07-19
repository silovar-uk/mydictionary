import { useState } from 'react'
import type { DictionaryEntry, Tag } from '../domain/types'
import { updateEntry } from '../services/entries'
import { Icon } from './Icon'
import { EntryFormFields, entryInputFromForm, entryToFormState } from './EntryFormFields'

interface Props {
  entry: DictionaryEntry
  tags: Tag[]
  onClose: () => void
  onSaved: (entry: DictionaryEntry) => void
}

export function EntryEditor({ entry, tags, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => entryToFormState(entry, tags))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
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
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sheet sheet--editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="sheet-header">
          <div>
            <div className="eyebrow">EDIT ENTRY</div>
            <h2 id="editor-title">辞書項目を育てる</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="閉じる"><Icon name="close" /></button>
        </header>
        <EntryFormFields value={form} onChange={setForm} />
        {error && <p className="error-text">{error}</p>}
        <footer className="sheet-footer">
          <button className="button button--ghost" type="button" onClick={onClose}>閉じる</button>
          <button className="button button--primary" type="button" onClick={() => void save()} disabled={saving || !form.headword.trim()}>{saving ? '保存中…' : '保存する'}</button>
        </footer>
      </section>
    </div>
  )
}
