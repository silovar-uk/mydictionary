import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { DictionaryEntry, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS, SOURCE_TYPE_LABELS, STATUS_LABELS } from '../domain/types'
import { markEntryViewed, softDeleteEntry, toggleFavorite } from '../services/entries'
import { Icon } from './Icon'
import { EntryEditor } from './EntryEditor'
import { EntryFieldEditor, type EntryEditSection } from './EntryFieldEditor'

interface Props {
  entry: DictionaryEntry
  tags: Tag[]
  onClose: () => void
  onChanged: (entry?: DictionaryEntry) => void
}

interface EditableSectionProps {
  title: string
  empty?: boolean
  children: ReactNode
  onEdit: () => void
  className?: string
}

function formatDate(value: string): string {
  if (!value) return ''
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

function EditableSection({ title, empty = false, children, onEdit, className = '' }: EditableSectionProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onEdit()
  }

  return (
    <section
      className={`entry-editable-section ${empty ? 'is-empty' : ''} ${className}`.trim()}
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={handleKeyDown}
      aria-label={`${title}を編集`}
    >
      <div className="entry-editable-section__heading"><h3>{title}</h3><span><Icon name="edit" /> 編集</span></div>
      {children}
    </section>
  )
}

function EmptyValue({ children = 'タップして追加' }: { children?: ReactNode }) {
  return <p className="entry-empty-value">{children}</p>
}

export function EntrySheet({ entry: initialEntry, tags, onClose, onChanged }: Props) {
  const [entry, setEntry] = useState(initialEntry)
  const [editing, setEditing] = useState(false)
  const [editingSection, setEditingSection] = useState<EntryEditSection | null>(null)
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

  function finishEditing(saved: DictionaryEntry) {
    setEntry(saved)
    setEditing(false)
    onChanged(saved)
    onClose()
  }

  function finishFieldEditing(saved: DictionaryEntry) {
    setEntry(saved)
    setEditingSection(null)
    onChanged(saved)
  }

  return (
    <>
      <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <article className="sheet entry-sheet" role="dialog" aria-modal="true" aria-labelledby="entry-title">
          <header className="entry-sheet__header">
            <div>
              <div className="entry-index">{ENTRY_TYPE_LABELS[entry.entryType]}・{STATUS_LABELS[entry.status]}</div>
              <div className="entry-sheet__edit-hint">各項目をタップして編集</div>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="閉じる"><Icon name="close" /></button>
          </header>

          <div
            className="entry-heading entry-heading--editable"
            role="button"
            tabIndex={0}
            onClick={() => setEditingSection('heading')}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                setEditingSection('heading')
              }
            }}
            aria-label="言葉の基本情報を編集"
          >
            <span className="entry-heading__edit"><Icon name="edit" /> 編集</span>
            {entry.reading && <div className="entry-reading">{entry.reading}</div>}
            <h2 id="entry-title">{entry.headword}</h2>
            <button className={`star-button ${entry.favorite ? 'is-active' : ''}`} type="button" onClick={(event) => { event.stopPropagation(); void favorite() }} aria-label={entry.favorite ? 'お気に入りから外す' : 'お気に入りにする'}><Icon name="star" /></button>
          </div>

          <div
            className={`entry-lead entry-lead--editable ${entry.shortMeaning ? '' : 'is-empty'}`}
            role="button"
            tabIndex={0}
            onClick={() => setEditingSection('shortMeaning')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setEditingSection('shortMeaning')
              }
            }}
            aria-label="一言での意味を編集"
          >
            <span className="entry-lead__label">一言での意味</span>
            <span>{entry.shortMeaning || 'タップして追加'}</span>
            <Icon name="edit" />
          </div>

          <div className="entry-body">
            <EditableSection title="意味・解釈" empty={!entry.meaning} onEdit={() => setEditingSection('meaning')}>
              {entry.meaning ? <p className="prewrap">{entry.meaning}</p> : <EmptyValue />}
            </EditableSection>

            <EditableSection title="出会ったとき" empty={!entry.encounteredDate && !entry.encounterContext} onEdit={() => setEditingSection('encounter')}>
              {entry.encounteredDate && <p className="entry-meta-line">{formatDate(entry.encounteredDate)}</p>}
              {entry.encounterContext ? <p className="prewrap">{entry.encounterContext}</p> : !entry.encounteredDate && <EmptyValue />}
            </EditableSection>

            <EditableSection title="原文・引用" empty={!entry.quotation} onEdit={() => setEditingSection('quotation')}>
              {entry.quotation ? <blockquote>{entry.quotation}</blockquote> : <EmptyValue />}
            </EditableSection>

            <EditableSection title="出典" empty={!entry.sourceTitle && !entry.sourceAuthor && !entry.sourceUrl && !entry.sourceLocator} onEdit={() => setEditingSection('source')}>
              {(entry.sourceTitle || entry.sourceAuthor || entry.sourceUrl || entry.sourceLocator) ? (
                <>
                  <p>{entry.sourceType ? SOURCE_TYPE_LABELS[entry.sourceType] : ''}{entry.sourceTitle ? `　${entry.sourceTitle}` : ''}{entry.sourceAuthor ? `／${entry.sourceAuthor}` : ''}{entry.sourceLocator ? `　${entry.sourceLocator}` : ''}</p>
                  {entry.sourceUrl && <a className="text-link" href={entry.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>出典を開く <Icon name="arrow" /></a>}
                </>
              ) : <EmptyValue />}
            </EditableSection>

            <EditableSection title="なぜ気になったか" empty={!entry.whySaved} onEdit={() => setEditingSection('whySaved')}>
              {entry.whySaved ? <p className="prewrap">{entry.whySaved}</p> : <EmptyValue />}
            </EditableSection>

            <EditableSection title="こんな時に使う" empty={!entry.usageNotes} onEdit={() => setEditingSection('usageNotes')}>
              {entry.usageNotes ? <p className="prewrap">{entry.usageNotes}</p> : <EmptyValue />}
            </EditableSection>

            <EditableSection title="用例" empty={entry.examples.length === 0} onEdit={() => setEditingSection('examples')}>
              {entry.examples.length > 0 ? <ul className="example-list">{entry.examples.map((example, index) => <li key={`${example}-${index}`}>{example}</li>)}</ul> : <EmptyValue />}
            </EditableSection>

            <EditableSection title="索引" empty={entryTags.length === 0} onEdit={() => setEditingSection('tags')}>
              {entryTags.length > 0 ? <div className="tag-list">{entryTags.map((tag) => <span className="tag" key={tag.id}>#{tag.name}</span>)}</div> : <EmptyValue>タップしてタグを追加</EmptyValue>}
            </EditableSection>
          </div>

          <footer className="entry-footer">
            <div className="entry-dates">追加 {formatDate(entry.createdAt)}<br />更新 {formatDate(entry.updatedAt)}</div>
            <div className="action-row">
              <button className="button button--ghost" type="button" onClick={() => setEditing(true)}><Icon name="edit" /> まとめて編集</button>
              <button className="button button--danger" type="button" onClick={() => void remove()}><Icon name="trash" /> 削除</button>
            </div>
          </footer>
        </article>
      </div>
      {editing && <EntryEditor entry={entry} tags={tags} onClose={() => setEditing(false)} onSaved={finishEditing} />}
      {editingSection && <EntryFieldEditor entry={entry} tags={tags} section={editingSection} onClose={() => setEditingSection(null)} onSaved={finishFieldEditing} />}
    </>
  )
}
