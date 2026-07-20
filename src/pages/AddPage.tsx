import { useEffect, useState } from 'react'
import { EntryFormFields, emptyEntryFormState, entryInputFromForm } from '../components/EntryFormFields'
import { Icon } from '../components/Icon'
import {
  clearAddContext,
  clearAddDraft,
  readAddContext,
  readAddDraft,
  setDictionarySaveFlash,
  writeAddDraft
} from '../lib/dictionaryJourney'
import { navigate } from '../lib/navigation'
import { createEntry } from '../services/entries'
import { importDrafts, textToDrafts } from '../services/transfer'

function isFormEmpty(form: ReturnType<typeof emptyEntryFormState>): boolean {
  return JSON.stringify(form) === JSON.stringify(emptyEntryFormState())
}

export function AddPage() {
  const [context] = useState(readAddContext)
  const [storedDraft] = useState(readAddDraft)
  const [form, setForm] = useState(() => ({
    ...emptyEntryFormState(),
    ...(storedDraft?.form ?? {}),
    ...(!storedDraft && context?.prefillHeadword ? { headword: context.prefillHeadword } : {})
  }))
  const [draftRestored, setDraftRestored] = useState(Boolean(storedDraft))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bulk, setBulk] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isFormEmpty(form)) clearAddDraft()
      else writeAddDraft(form)
    }, 280)
    return () => window.clearTimeout(timer)
  }, [form])

  function returnToDictionary() {
    if (!isFormEmpty(form)) writeAddDraft(form)
    clearAddContext()
    navigate('dictionary')
  }

  function discardDraft() {
    clearAddDraft()
    setDraftRestored(false)
    setForm({ ...emptyEntryFormState(), headword: context?.prefillHeadword ?? '' })
  }

  async function saveEntry() {
    if (!form.headword.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const saved = await createEntry(entryInputFromForm(form))
      clearAddDraft()
      clearAddContext()
      setDictionarySaveFlash(saved.id)
      navigate('dictionary')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存できませんでした。入力内容は下書きに残しています。')
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
      clearAddContext()
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

      {context?.fromDictionary && <div className="add-return-context"><button type="button" onClick={returnToDictionary}><Icon name="arrow" /> 辞典に戻る</button><span>{context.query ? `「${context.query}」の検索結果から` : '見ていた辞典の場所へ戻れます'}</span></div>}
      {draftRestored && <div className="draft-restored" role="status"><span><strong>入力途中の内容を復元しました</strong><small>画面を離れても、この端末に下書きが残ります。</small></span><button type="button" onClick={discardDraft}>下書きを消す</button></div>}

      <section className="entry-create-panel paper-panel">
        <div className="entry-create-panel__intro">
          <div className="eyebrow">NEW ENTRY</div>
          <h2>辞書項目をつくる</h2>
          <p className="muted">見出し語だけで保存できる。残りの項目は、あとから少しずつ育てられる。</p>
        </div>
        <EntryFormFields
          value={form}
          onChange={setForm}
          autoFocus={!draftRestored}
          onSave={() => { void saveEntry() }}
          saving={saving}
          saveDisabled={!form.headword.trim()}
        />
        {error && <p className="error-text entry-save-error" role="alert">{error}</p>}
        <div className="entry-create-actions">
          <span>{form.headword.trim() ? '未入力の項目は、あとから編集できます。' : '見出し語を入れると保存できます。'}</span>
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
