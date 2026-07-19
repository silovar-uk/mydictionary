import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { db, notifyDatabaseChanged } from '../db/database'
import type { DictionaryEntry, EntryDraft, Tag } from '../domain/types'
import { formatShortDate } from '../lib/format'
import { permanentlyDeleteEntry, restoreEntry } from '../services/entries'
import {
  backupToJson,
  createBackup,
  countDuplicateDrafts,
  csvToDrafts,
  downloadText,
  entriesToCsv,
  entriesToText,
  importDrafts,
  restoreBackup,
  textToDrafts,
  validateBackup
} from '../services/transfer'

export function DataPage({ entries, tags }: { entries: DictionaryEntry[]; tags: Tag[] }) {
  const [message, setMessage] = useState('')
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({})
  const [deleted, setDeleted] = useState<DictionaryEntry[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function refreshDeleted() {
    setDeleted((await db.entries.toArray()).filter((entry) => Boolean(entry.deletedAt)).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)))
  }

  useEffect(() => {
    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((estimate) => setStorage({ usage: estimate.usage, quota: estimate.quota }))
    }
    void refreshDeleted()
  }, [entries])

  async function exportJson() {
    const backup = await createBackup()
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '')
    await downloadText(`watashi-jiten_backup_${stamp}.json`, backupToJson(backup), 'application/json;charset=utf-8')
    await db.settings.put({ key: 'lastBackupAt', value: new Date().toISOString() })
    notifyDatabaseChanged()
    setMessage(`${backup.counts.entries}件の完全バックアップを書き出しました。`)
  }

  async function exportCsv() {
    await downloadText(`watashi-jiten_${new Date().toISOString().slice(0, 10)}.csv`, entriesToCsv(entries, tags), 'text/csv;charset=utf-8')
    setMessage(`${entries.length}件をCSVで書き出しました。`)
  }

  async function exportText() {
    await downloadText(`watashi-jiten_words_${new Date().toISOString().slice(0, 10)}.txt`, entriesToText(entries), 'text/plain;charset=utf-8')
    setMessage(`${entries.length}件の見出し語を書き出しました。`)
  }

  async function handleFile(file: File) {
    if (file.size > 50 * 1024 * 1024) throw new Error('50MBを超えるファイルは読み込めません。')
    const text = await file.text()
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'json') {
      const parsed: unknown = JSON.parse(text)
      if (!validateBackup(parsed)) throw new Error('対応していない、または壊れているバックアップです。')
      const backup = parsed
      if (!window.confirm(`現在のデータを置き換えて、${backup.counts?.entries ?? backup.entries?.length ?? 0}件を復元しますか？`)) return
      await restoreBackup(backup)
      setMessage('バックアップを復元しました。')
      return
    }
    const drafts: EntryDraft[] = extension === 'csv' ? csvToDrafts(text) : textToDrafts(text)
    if (drafts.length === 0) throw new Error('取り込める項目がありません。')
    const duplicateCount = countDuplicateDrafts(drafts, entries)
    const preview = drafts.slice(0, 3).map((draft) => `・${draft.headword}`).join('\n')
    const duplicateLine = duplicateCount > 0 ? `\n同じ見出し語の候補：${duplicateCount}件（両方残します）` : ''
    if (!window.confirm(`${drafts.length}件を追加します。${duplicateLine}\n\n${preview}${drafts.length > 3 ? '\n…' : ''}`)) return
    const count = await importDrafts(drafts)
    setMessage(`${count}件を追加しました。`)
  }

  return (
    <main className="page">
      <header className="page-heading"><div><div className="eyebrow">YOUR DATA, YOURS</div><h1>データ</h1><p>アプリに閉じ込めず、いつでも全部持ち出せる。</p></div></header>
      <section className="data-card data-card--primary paper-panel">
        <div className="data-card__icon"><Icon name="database" /></div>
        <div><div className="eyebrow">COMPLETE BACKUP</div><h2>完全バックアップ</h2><p>意味、出典、タグ、閲覧履歴を含む。空の状態から丸ごと復元できる形式。</p></div>
        <button className="button button--primary" type="button" onClick={() => void exportJson()}><Icon name="download" /> JSONを書き出す</button>
      </section>
      <div className="data-grid">
        <section className="data-card paper-panel"><div className="data-card__icon"><Icon name="download" /></div><h2>CSV</h2><p>スプレッドシートで並べ替えたり、別のサービスへ移すための形式。</p><button className="button button--ghost" type="button" onClick={() => void exportCsv()}>CSVを書き出す</button></section>
        <section className="data-card paper-panel"><div className="data-card__icon"><Icon name="book" /></div><h2>言葉だけ</h2><p>見出し語を1行ずつ並べた、最も軽いテキスト形式。</p><button className="button button--ghost" type="button" onClick={() => void exportText()}>TXTを書き出す</button></section>
      </div>
      <section className="data-card paper-panel">
        <div className="data-card__icon"><Icon name="upload" /></div><div className="eyebrow">IMPORT</div><h2>取り込む</h2><p>JSONは完全復元。CSV・TXTは現在の辞典へ追加する。実行前に件数と先頭項目を確認できる。</p>
        <input ref={fileRef} className="visually-hidden" type="file" accept=".json,.csv,.txt,application/json,text/csv,text/plain" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file).catch((error) => setMessage(error instanceof Error ? error.message : '読み込めませんでした。')); event.currentTarget.value = '' }} />
        <button className="button button--ghost" type="button" onClick={() => fileRef.current?.click()}><Icon name="upload" /> ファイルを選ぶ</button>
      </section>
      <section className="storage-card">
        <div><Icon name="database" /><span>端末内ストレージ</span></div>
        <strong>{storage.usage !== undefined ? `${(storage.usage / 1024 / 1024).toFixed(1)} MB` : '取得できません'}</strong>
        {storage.quota !== undefined && <small>推定上限 {(storage.quota / 1024 / 1024 / 1024).toFixed(1)} GB</small>}
      </section>
      {deleted.length > 0 && (
        <section className="section-block">
          <div className="section-heading"><div><div className="eyebrow">RECENTLY DELETED</div><h2>最近削除した項目</h2></div></div>
          <div className="deleted-list">{deleted.map((entry) => <div key={entry.id}><span><strong>{entry.headword}</strong><small>{formatShortDate(entry.deletedAt)} 削除</small></span><div><button className="text-button" type="button" onClick={() => void restoreEntry(entry.id).then(refreshDeleted)}>復元</button><button className="text-button text-button--danger" type="button" onClick={() => { if (window.confirm('完全に削除しますか？この操作は取り消せません。')) void permanentlyDeleteEntry(entry.id).then(refreshDeleted) }}>完全削除</button></div></div>)}</div>
        </section>
      )}
      <div className="status-message status-message--large" aria-live="polite">{message}</div>
    </main>
  )
}
