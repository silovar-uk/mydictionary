import { useState } from 'react'
import { Icon } from '../components/Icon'
import { QuickAdd } from '../components/QuickAdd'
import { importDrafts, textToDrafts } from '../services/transfer'

export function AddPage() {
  const [bulk, setBulk] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function importBulk() {
    const drafts = textToDrafts(bulk)
    if (drafts.length === 0) return
    setBusy(true)
    try {
      const count = await importDrafts(drafts)
      setBulk('')
      setBulkMessage(`${count}件を拾いました。`)
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : '取り込めませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <header className="page-heading"><div><div className="eyebrow">CAPTURE FIRST</div><h1>拾う</h1><p>完成させなくていい。引っかかった瞬間だけ、まず残す。</p></div></header>
      <QuickAdd />
      <section className="bulk-import paper-panel">
        <div className="eyebrow">BULK CAPTURE</div>
        <h2>まとめて拾う</h2>
        <p className="muted">1行につき1項目。<code>言葉｜一言メモ｜タグ</code>でも取り込める。</p>
        <label className="field"><span>貼り付ける</span><textarea value={bulk} onChange={(event) => setBulk(event.target.value)} rows={8} placeholder={'解像度を上げる\n偶然を設計する｜忘れた言葉に戻る仕組み｜企画, 言葉'} /></label>
        <div className="action-row"><button className="button button--primary" type="button" onClick={() => void importBulk()} disabled={busy || !bulk.trim()}><Icon name="plus" /> {busy ? '取込中…' : `${textToDrafts(bulk).length || ''}件を拾う`}</button></div>
        <div className="status-message" aria-live="polite">{bulkMessage}</div>
      </section>
    </main>
  )
}

