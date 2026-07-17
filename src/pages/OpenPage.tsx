import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { buildDiscoveryPage } from '../domain/discovery'
import type { DictionaryEntry, DiscoveryMode, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS } from '../domain/types'
import { markEntriesRandomShown } from '../services/entries'

export function OpenPage({ entries, tags, onOpen }: { entries: DictionaryEntry[]; tags: Tag[]; onOpen: (entry: DictionaryEntry) => void }) {
  const [mode, setMode] = useState<DiscoveryMode>('thoughtful')
  const [page, setPage] = useState<DictionaryEntry[]>([])
  const [pageNumber, setPageNumber] = useState(0)
  const touchStart = useRef<number | null>(null)

  function openPage(nextMode = mode) {
    const next = buildDiscoveryPage(entries, nextMode, 5)
    setMode(nextMode)
    setPage(next)
    setPageNumber((current) => current + 1)
    void markEntriesRandomShown(next.map((entry) => entry.id))
  }

  useEffect(() => {
    if (entries.length > 0 && page.length === 0) openPage('thoughtful')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length])

  if (entries.length === 0) {
    return <main className="page"><header className="page-heading"><div><div className="eyebrow">OPEN ANYWHERE</div><h1>開く</h1></div></header><EmptyState title="まだ開ける頁がない">まず一語拾うと、ここが「適当に開ける辞書」になる。</EmptyState></main>
  }

  return (
    <main className="page page--open">
      <header className="page-heading"><div><div className="eyebrow">OPEN ANYWHERE</div><h1>適当に開く</h1><p>探していない言葉に、会いにいく。</p></div></header>
      <div className="mode-tabs" role="tablist" aria-label="開き方">
        {([['thoughtful', 'おまかせ'], ['random', '完全ランダム'], ['dormant', '久しぶり'], ['unseen', '未読'], ['growing', '育て中']] as [DiscoveryMode, string][]).map(([value, label]) => <button key={value} className={mode === value ? 'is-active' : ''} type="button" onClick={() => openPage(value)}>{label}</button>)}
      </div>
      <div
        className="open-page paper-page"
        onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return
          const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current
          if (Math.abs(delta) > 60) openPage()
          touchStart.current = null
        }}
      >
        <div className="paper-page__rule"><span>OPEN AT RANDOM</span><span>{mode === 'random' ? '偶然' : '再会'}</span></div>
        {page.map((entry, index) => (
          <button className="open-entry" type="button" key={entry.id} onClick={() => onOpen(entry)}>
            <span className="open-entry__marker">{String(index + 1).padStart(2, '0')}</span>
            <span className="open-entry__body">
              <span className="open-entry__reading">{entry.reading || ENTRY_TYPE_LABELS[entry.entryType]}</span>
              <strong>{entry.headword}</strong>
              <span>{entry.shortMeaning || entry.encounterContext || entry.whySaved || 'まだ説明のない言葉'}</span>
              <span className="open-entry__tags">{entry.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name).filter(Boolean).slice(0, 2).map((tag) => `#${tag}`).join(' ')}</span>
            </span>
          </button>
        ))}
        <div className="paper-page__folio">— {String(pageNumber).padStart(3, '0')} —</div>
      </div>
      <button className="turn-page-button" type="button" onClick={() => openPage()}><span>もう一頁</span><Icon name="arrow" /></button>
      <p className="gesture-hint">左右にスワイプしても、次の頁へ。</p>
    </main>
  )
}

