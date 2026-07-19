import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { EntryRow } from '../components/EntryRow'
import { Icon } from '../components/Icon'
import type { DictionaryEntry, Tag } from '../domain/types'
import { searchEntries } from '../services/search'

export function DictionaryPage({ entries, tags, initialQuery, onQueryChange, onOpen }: { entries: DictionaryEntry[]; tags: Tag[]; initialQuery: string; onQueryChange: (value: string) => void; onOpen: (entry: DictionaryEntry) => void }) {
  const [sort, setSort] = useState<'updated' | 'created' | 'headword' | 'viewed'>('updated')
  const [status, setStatus] = useState<'all' | 'captured' | 'growing' | 'owned' | 'favorite'>('all')
  const query = initialQuery
  const hits = useMemo(() => searchEntries(entries, tags, query), [entries, tags, query])
  const filtered = hits.filter(({ entry }) => status === 'all' || (status === 'favorite' ? entry.favorite : entry.status === status))
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'headword') return a.entry.normalizedHeadword.localeCompare(b.entry.normalizedHeadword, 'ja')
    if (sort === 'created') return b.entry.createdAt.localeCompare(a.entry.createdAt)
    if (sort === 'viewed') return b.entry.viewCount - a.entry.viewCount
    return b.entry.updatedAt.localeCompare(a.entry.updatedAt)
  })

  return (
    <main className="page">
      <header className="page-heading">
        <div><div className="eyebrow">THE WHOLE BOOK</div><h1>辞典</h1><p>言葉そのものを忘れていても、メモや出典から探せる。</p></div>
        <div className="page-heading__count">{sorted.length}<small>語</small></div>
      </header>
      <div className="search-box search-box--large">
        <Icon name="search" />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="言葉、意味、出会った場面、タグ…" autoFocus={Boolean(query)} />
        {query && <button type="button" onClick={() => onQueryChange('')} aria-label="検索をクリア"><Icon name="close" /></button>}
      </div>
      <div className="filter-bar">
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="状態で絞り込み">
          <option value="all">すべて</option><option value="captured">拾った</option><option value="growing">育て中</option><option value="owned">自分の言葉</option><option value="favorite">お気に入り</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="並び順">
          <option value="updated">更新が新しい順</option><option value="created">追加が新しい順</option><option value="headword">見出し語順</option><option value="viewed">よく見る順</option>
        </select>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title={query ? '見つからなかった' : 'まだ言葉がない'}>{query ? '別の言い方やタグで探すか、適当に辞書を開いてみる。' : '下の「拾う」から、最初の言葉を置いてみる。'}</EmptyState>
      ) : (
        <div className="dictionary-list">{sorted.map(({ entry, reason }) => <EntryRow key={entry.id} entry={entry} tags={tags} reason={reason} onOpen={() => onOpen(entry)} />)}</div>
      )}
    </main>
  )
}

