import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { EntryRow } from '../components/EntryRow'
import { Icon } from '../components/Icon'
import type { DictionaryEntry, Tag } from '../domain/types'
import {
  consumeDictionarySaveFlash,
  readDictionaryViewState,
  startAddFromDictionary,
  updateDictionaryViewState,
  type DictionarySort,
  type DictionaryStatusFilter
} from '../lib/dictionaryJourney'
import { navigate } from '../lib/navigation'
import { searchEntries } from '../services/search'

const STATUS_OPTIONS: { value: DictionaryStatusFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'captured', label: '拾った' },
  { value: 'growing', label: '育て中' },
  { value: 'owned', label: '自分の言葉' },
  { value: 'favorite', label: 'お気に入り' }
]

export function DictionaryPage({ entries, tags, initialQuery, onQueryChange, onOpen }: { entries: DictionaryEntry[]; tags: Tag[]; initialQuery: string; onQueryChange: (value: string) => void; onOpen: (entry: DictionaryEntry) => void }) {
  const storedState = useRef(readDictionaryViewState())
  const [sort, setSort] = useState<DictionarySort>(storedState.current.sort)
  const [status, setStatus] = useState<DictionaryStatusFilter>(storedState.current.status)
  const [flash, setFlash] = useState(consumeDictionarySaveFlash)
  const [toolsCompact, setToolsCompact] = useState(false)
  const query = initialQuery
  const hits = useMemo(() => searchEntries(entries, tags, query), [entries, tags, query])
  const filtered = hits.filter(({ entry }) => status === 'all' || (status === 'favorite' ? entry.favorite : entry.status === status))
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'headword') return a.entry.normalizedHeadword.localeCompare(b.entry.normalizedHeadword, 'ja')
    if (sort === 'created') return b.entry.createdAt.localeCompare(a.entry.createdAt)
    if (sort === 'viewed') return b.entry.viewCount - a.entry.viewCount
    return b.entry.updatedAt.localeCompare(a.entry.updatedAt)
  })
  const savedEntryIsVisible = Boolean(flash && sorted.some(({ entry }) => entry.id === flash.entryId))
  const activeConditionCount = Number(status !== 'all') + Number(sort !== 'updated')

  useEffect(() => {
    updateDictionaryViewState({ status })
  }, [status])

  useEffect(() => {
    updateDictionaryViewState({ sort })
  }, [sort])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: storedState.current.scrollY, behavior: 'auto' }))
    return () => {
      window.cancelAnimationFrame(frame)
      updateDictionaryViewState({ scrollY: window.scrollY })
    }
  }, [])

  useEffect(() => {
    const updateCompactState = () => setToolsCompact(window.scrollY > 118)
    updateCompactState()
    window.addEventListener('scroll', updateCompactState, { passive: true })
    return () => window.removeEventListener('scroll', updateCompactState)
  }, [])

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 4_500)
    return () => window.clearTimeout(timer)
  }, [flash])

  function resetConditions() {
    setStatus('all')
    setSort('updated')
  }

  function openAdd(prefillHeadword = '') {
    updateDictionaryViewState({ scrollY: window.scrollY })
    startAddFromDictionary(query, prefillHeadword)
    navigate('add')
  }

  return (
    <main className="page page--dictionary">
      <header className="page-heading dictionary-heading">
        <div><div className="eyebrow">THE WHOLE BOOK</div><h1>辞典</h1><p>言葉そのものを忘れていても、メモや出典から探せる。</p></div>
        <div className="page-heading__count">{sorted.length}<small>語</small></div>
      </header>

      <section className={`dictionary-tools ${toolsCompact ? 'is-compact' : ''}`} aria-label="辞典の検索と絞り込み">
        <div className="search-box search-box--large">
          <Icon name="search" />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="言葉、意味、出会った場面、タグ…" autoFocus={Boolean(query)} />
          {query && <button type="button" onClick={() => onQueryChange('')} aria-label="検索をクリア"><Icon name="close" /></button>}
        </div>
        <div className="dictionary-filter-row">
          <div className="status-chips" role="group" aria-label="状態で絞り込み">
            {STATUS_OPTIONS.map((option) => (
              <button className={status === option.value ? 'is-active' : ''} type="button" aria-pressed={status === option.value} onClick={() => setStatus(option.value)} key={option.value}>{option.label}</button>
            ))}
          </div>
          <label className="dictionary-sort"><span>並び順</span><select value={sort} onChange={(event) => setSort(event.target.value as DictionarySort)} aria-label="並び順">
            <option value="updated">更新が新しい順</option><option value="created">追加が新しい順</option><option value="headword">見出し語順</option><option value="viewed">よく見る順</option>
          </select></label>
        </div>
        {activeConditionCount > 0 && <div className="dictionary-condition-summary"><span>{activeConditionCount}件の条件を適用中</span><button type="button" onClick={resetConditions}>条件を戻す</button></div>}
      </section>

      {flash && <div className="dictionary-toast" role="status"><strong>{flash.message}</strong><span>{savedEntryIsVisible ? '一覧に追加した言葉を表示しています。' : '現在の検索・絞り込み条件では表示されていません。'}</span><button type="button" onClick={() => setFlash(null)} aria-label="通知を閉じる"><Icon name="close" /></button></div>}

      {sorted.length === 0 ? (
        <EmptyState
          title={query ? '見つからなかった' : 'まだ言葉がない'}
          action={<button className="button button--primary empty-state__action" type="button" onClick={() => openAdd(query)}><Icon name="plus" /> {query ? `「${query}」を拾う` : '最初の言葉を拾う'}</button>}
        >{query ? '別の言い方やタグで探すか、この検索語を新しい言葉として残せる。' : '最初の言葉を置くと、ここが自分だけの辞典になっていく。'}</EmptyState>
      ) : (
        <div className="dictionary-list">{sorted.map(({ entry, reason }) => <EntryRow key={entry.id} entry={entry} tags={tags} reason={reason} highlighted={flash?.entryId === entry.id} onOpen={() => onOpen(entry)} />)}</div>
      )}
    </main>
  )
}
