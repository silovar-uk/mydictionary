import { useEffect, useMemo, useState } from 'react'
import type { DictionaryEntry, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS, SOURCE_TYPE_LABELS, STATUS_LABELS } from '../domain/types'
import { markEntryViewed, softDeleteEntry, toggleFavorite } from '../services/entries'
import { Icon } from './Icon'
import { EntryEditor } from './EntryEditor'

interface Props {
  entry: DictionaryEntry
  tags: Tag[]
  onClose: () => void
  onChanged: (entry?: DictionaryEntry) => void
}

function formatDate(value: string): string {
  if (!value) return ''
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

export function EntrySheet({ entry: initialEntry, tags, onClose, onChanged }: Props) {
  const [entry, setEntry] = useState(initialEntry)
  const [editing, setEditing] = useState(false)
  const entryTags = useMemo(() => entry.tagIds.map((id) => tags.find((tag) => tag.id === id)).filter((tag): tag is Tag => Boolean(tag)), [entry, tags])

  useEffect(() => {
    const timer = window.setTimeout(() => void markEntryViewed(entry.id), 2_000)
    return () => window.clearTimeout(timer)
  }, [entry.id])

  async function favorite() {
    await toggleFavorite(entry.id)
    const next = { ...entry, favorite: !entry.favorite }
    setEntry(next)
    onChanged(next)
  }

  async function remove() {
    if (!window.confirm(`「${entry.headword}」を最近削除した項目へ移しますか？`)) return
    await softDeleteEntry(entry.id)
    onChanged()
    onClose()
  }

  return (
    <>
      <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <article className="sheet entry-sheet" role="dialog" aria-modal="true" aria-labelledby="entry-title">
          <header className="entry-sheet__header">
            <div className="entry-index">{ENTRY_TYPE_LABELS[entry.entryType]}・{STATUS_LABELS[entry.status]}</div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="閉じる"><Icon name="close" /></button>
          </header>
          <div className="entry-heading">
            {entry.reading && <div className="entry-reading">{entry.reading}</div>}
            <h2 id="entry-title">{entry.headword}</h2>
            <button className={`star-button ${entry.favorite ? 'is-active' : ''}`} type="button" onClick={() => void favorite()} aria-label={entry.favorite ? 'お気に入りから外す' : 'お気に入りにする'}><Icon name="star" /></button>
          </div>
          {entry.shortMeaning && <p className="entry-lead">{entry.shortMeaning}</p>}

          <div className="entry-body">
            {entry.meaning && <section><h3>意味・解釈</h3><p className="prewrap">{entry.meaning}</p></section>}
            {(entry.encounteredDate || entry.encounterContext) && <section><h3>出会ったとき</h3>{entry.encounteredDate && <p className="entry-meta-line">{formatDate(entry.encounteredDate)}</p>}{entry.encounterContext && <p className="prewrap">{entry.encounterContext}</p>}</section>}
            {entry.quotation && <section><h3>原文・引用</h3><blockquote>{entry.quotation}</blockquote></section>}
            {(entry.sourceTitle || entry.sourceAuthor || entry.sourceUrl) && <section><h3>出典</h3><p>{entry.sourceType ? SOURCE_TYPE_LABELS[entry.sourceType] : ''}{entry.sourceTitle ? `　${entry.sourceTitle}` : ''}{entry.sourceAuthor ? `／${entry.sourceAuthor}` : ''}{entry.sourceLocator ? `　${entry.sourceLocator}` : ''}</p>{entry.sourceUrl && <a className="text-link" href={entry.sourceUrl} target="_blank" rel="noreferrer">出典を開く <Icon name="arrow" /></a>}</section>}
            {entry.whySaved && <section><h3>なぜ気になったか</h3><p className="prewrap">{entry.whySaved}</p></section>}
            {entry.usageNotes && <section><h3>こんな時に使う</h3><p className="prewrap">{entry.usageNotes}</p></section>}
            {entry.examples.length > 0 && <section><h3>用例</h3><ul className="example-list">{entry.examples.map((example, index) => <li key={`${example}-${index}`}>{example}</li>)}</ul></section>}
            {entryTags.length > 0 && <section><h3>索引</h3><div className="tag-list">{entryTags.map((tag) => <span className="tag" key={tag.id}>#{tag.name}</span>)}</div></section>}
          </div>
          <footer className="entry-footer">
            <div className="entry-dates">追加 {formatDate(entry.createdAt)}<br />更新 {formatDate(entry.updatedAt)}</div>
            <div className="action-row">
              <button className="button button--ghost" type="button" onClick={() => setEditing(true)}><Icon name="edit" /> 編集</button>
              <button className="button button--danger" type="button" onClick={() => void remove()}><Icon name="trash" /> 削除</button>
            </div>
          </footer>
        </article>
      </div>
      {editing && <EntryEditor entry={entry} tags={tags} onClose={() => setEditing(false)} onSaved={(saved) => { setEntry(saved); setEditing(false); onChanged(saved) }} />}
    </>
  )
}
