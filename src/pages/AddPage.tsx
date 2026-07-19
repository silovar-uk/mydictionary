import { useState } from 'react'
import { EntryFormFields, emptyEntryFormState, entryInputFromForm } from '../components/EntryFormFields'
import { Icon } from '../components/Icon'
import { navigate } from '../lib/navigation'
import { createEntry } from '../services/entries'
import { importDrafts, textToDrafts } from '../services/transfer'

export function AddPage() {
  const [form, setForm] = useState(emptyEntryFormState)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bulk, setBulk] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveEntry() {
    if (!form.headword.trim()) return
    setSaving(true)
    setError('')
    try {
      await createEntry(entryInputFromForm(form))
      navigate('dictionary')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  async function importBulk() {
    const drafts = textToDrafts(bulk)
    if (drafts.length === 0) return
    setBusy(true)
    setBulkMessage('')
    try {
      await importDrafts(drafts)
      navigate('dictionary')
    } catch (importError) {
      setBulkMessage(importError instanceof Error ? importError.message : '取り込めませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page page--add">
      <header className="page-heading"><div><div className="eyebrow">CREATE ENTRY</div><h1>拾う</h1><p>言葉、意味、出会い、出典、活用。わかるところまで、ひと続きの用紙に残す。</p></div></header>

      <section className="entry-create-panel paper-panel">
        <div className="entry-create-panel__intro">
          <div className="eyebrow">NEW ENTRY</div>
          <h2>辞書項目をつくる</h2>
          <p className="muted">すべての項目を見ながら入力できる。見出し語だけでも保存でき、残りはあとから育てられる。</p>
        </div>
        <EntryFormFields value={form} onChange={setForm} autoFocus />
        {error && <p className="error-text">{error}</p>}
        <div className="entry-create-actions">
          <span>未入力の項目は、あとから編集できます。</span>
          <button className="button button--primary" type="button" onClick={() => void saveEntry()} disabled={saving || !form.headword.trim()}><Icon name="plus" /> {saving ? '保存中…' : '保存して辞典へ'}</button>
        </div>
      </section>

      <section className="bulk-import paper-panel">
        <div className="eyebrow">BULK CAPTURE</div>
        <h2>まとめて拾う</h2>
        <p className="muted">1行につき1項目。<code>言葉｜一言メモ｜タグ</code>でも取り込める。完了後は辞典一覧へ移動する。</p>
        <label className="field"><span>貼り付ける</span><textarea value={bulk} onChange={(event) => setBulk(event.target.value)} rows={8} placeholder={'解像度を上げる\n偶然を設計する｜忘れた言葉に戻る仕組み｜企画, 言葉'} /></label>
        <div className="action-row"><button className="button button--primary" type="button" onClick={() => void importBulk()} disabled={busy || !bulk.trim()}><Icon name="plus" /> {busy ? '取込中…' : `${textToDrafts(bulk).length || ''}件を拾って一覧へ`}</button></div>
        <div className="status-message" aria-live="polite">{bulkMessage}</div>
      </section>
    </main>
  )
}
