import type { DictionaryEntry, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS } from '../domain/types'
import { formatShortDate } from '../lib/format'
import { Icon } from './Icon'

export function EntryRow({ entry, tags, reason, onOpen }: { entry: DictionaryEntry; tags: Tag[]; reason?: string; onOpen: () => void }) {
  const entryTags = entry.tagIds.map((id) => tags.find((tag) => tag.id === id)).filter((tag): tag is Tag => Boolean(tag)).slice(0, 3)
  return (
    <button className="dictionary-row" type="button" onClick={onOpen}>
      <div className="dictionary-row__index">{entry.reading || ENTRY_TYPE_LABELS[entry.entryType]}</div>
      <div className="dictionary-row__main">
        <div className="dictionary-row__title-line"><h3>{entry.headword}</h3>{entry.favorite && <Icon name="star" className="tiny-star" />}</div>
        <p>{entry.shortMeaning || entry.whySaved || entry.encounterContext || 'まだ意味は書かれていない。'}</p>
        <div className="dictionary-row__meta">
          {reason && <span>{reason}</span>}
          {entryTags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}
        </div>
      </div>
      <div className="dictionary-row__date">{formatShortDate(entry.createdAt)}</div>
    </button>
  )
}
