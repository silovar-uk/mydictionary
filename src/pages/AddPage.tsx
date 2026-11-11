import { useEffect, useState } from 'react'
import { EntryFormFields, emptyEntryFormState, entryInputFromForm } from '../components/EntryFormFields'
import { Icon } from '../components/Icon'
import { ReunionRibbon } from '../components/ReunionRibbon'
import type { DictionaryEntry } from '../domain/types'
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

export function AddPage({ entries, onOpen }: { entries: DictionaryEntry[]; onOpen: (entry: DictionaryEntry) => void }) {
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
  const [isComposing, setIsComposing] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isFormEmpty(form)) clearAddDraft()
      else writeAddDraft(form)
    }, 280)
    return () => window.clearTimeout(timer)
  }, [form])

  function goBack() {
    if (!isFormEmpty(form)) writeAddDraft(form)
    if (context?.fromDictionary) {
      clearAddContext()
      navigate('dictionary')
    } else {
      navigate('today')
    }
  }

  function openPrevious(entry: DictionaryEntry) {
    // Save immediately before showing a previous record, even while the debounce is pending.
    if (!isFormEmpty(form)) writeAddDraft(form)
    onOpen(entry)
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
    <main className="page page--add page--add-compact">
      <header className="add-compact__header">
        <button className="add-compact__back" type="button" onClick={goBack} aria-label={context?.fromDictionary ? '辞典に戻る' : '今日に戻る'}>
          <Icon name="arrow" />
        </button>
        <h1>追加</h1>
        <button
          className="button button--primary add-compact__save"
          type="submit"
          form="add-compact-form"
          disabled={!form.headword.trim() || saving}
        >{saving ? '保存中…' : '保存'}</button>
      </header>

      {draftRestored && (
        <div className="add-compact__restored" role="status">
          <span>下書きを復元しました</span>
          <button type="button" onClick={discardDraft}>破棄</button>
        </div>
      )}

      <form
        id="add-compact-form"
        className="add-compact__form"
        onSubmit={(event) => { event.preventDefault(); void saveEntry() }}
      >
        <label className="add-compact__field">
          <span>名前 <small>必須</small></span>
          <textarea
            rows={1}
            maxLength={10_000}
            value={form.headword}
            onChange={(event) => setForm((current) => ({ ...current, headword: event.target.value }))}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onBlur={() => setIsComposing(false)}
            placeholder="言葉や用語の名前"
          />
        </label>

        <label className="add-compact__field">
          <span>よみ <small>任意</small></span>
          <input
            type="text"
            value={form.reading}
            onChange={(event) => setForm((current) => ({ ...current, reading: event.target.value }))}
            placeholder="ひらがななど"
          />
        </label>

        <label className="add-compact__field">
          <span>ひとこと <small>任意</small></span>
          <textarea
            rows={2}
            value={form.shortMeaning}
            onChange={(event) => setForm((current) => ({ ...current, shortMeaning: event.target.value }))}
            placeholder="意味や覚えておきたいこと"
          />
        </label>

        <div className="add-compact__reunion">
          <ReunionRibbon entries={entries} headword={form.headword} isComposing={isComposing} onOpenPrevious={openPrevious} />
        </div>

        {error && <p className="error-text add-compact__error" role="alert">{error}</p>}

        <details className="add-compact__details">
          <summary><Icon name="edit" /><span>詳細項目を追加</span><Icon name="arrow" /></summary>
          <p className="add-compact__details-note">出典・用例・タグなど。保存後も編集できます。</p>
          <EntryFormFields value={form} onChange={setForm} advancedOnly />
        </details>
      </form>

      <details className="add-compact__bulk">
        <summary>まとめて追加する</summary>
        <div className="add-compact__bulk-body">
          <p>1行に1項目。「言葉｜ひとこと｜タグ」でも追加できます。</p>
          <label className="field">
            <span>貼り付ける</span>
            <textarea value={bulk} onChange={(event) => setBulk(event.target.value)} rows={6} placeholder="アブダクション" />
          </label>
          <button className="button button--primary" type="button" onClick={() => void importBulk()} disabled={busy || !bulk.trim()}>
            {busy ? '追加中…' : 'まとめて保存'}
          </button>
          <div className="status-message" aria-live="polite">{bulkMessage}</div>
        </div>
      </details>
    </main>
  )
}
