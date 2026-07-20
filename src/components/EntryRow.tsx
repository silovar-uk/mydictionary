import type { DictionaryEntry, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS, STATUS_LABELS } from '../domain/types'
import { formatShortDate } from '../lib/format'
import { Icon } from './Icon'

export function EntryRow({ entry, tags, reason, highlighted = false, onOpen }: { entry: DictionaryEntry; tags: Tag[]; reason?: string; highlighted?: boolean; onOpen: () => void }) {
  const entryTags = entry.tagIds.map((id) => tags.find((tag) => tag.id === id)).filter((tag): tag is Tag => Boolean(tag)).slice(0, 2)
  return (
    <button className={`dictionary-row ${highlighted ? 'is-highlighted' : ''}`} data-entry-id={entry.id} type="button" onClick={onOpen}>
      <div className="dictionary-row__main">
        <div className="dictionary-row__index">{entry.reading || ENTRY_TYPE_LABELS[entry.entryType]}<span>・{STATUS_LABELS[entry.status]}</span></div>
        <div className="dictionary-row__title-line"><h3>{entry.headword}</h3>{entry.favorite && <Icon name="star" className="tiny-star" />}</div>
        <p>{entry.shortMeaning || entry.whySaved || entry.encounterContext || 'まだ意味は書かれていない。'}</p>
        <div className="dictionary-row__meta">
          {reason && <span className="dictionary-row__reason">{reason}</span>}
          {entryTags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}
        </div>
      </div>
      <div className="dictionary-row__date">{formatShortDate(entry.createdAt)}</div>
    </button>
  )
}
