import { useMemo } from 'react'
import { QuickAdd } from '../components/QuickAdd'
import { EmptyState } from '../components/EmptyState'
import { EntryRow } from '../components/EntryRow'
import { Icon } from '../components/Icon'
import { buildDiscoveryPage } from '../domain/discovery'
import type { DictionaryEntry, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS } from '../domain/types'
import { seededRandom } from '../lib/format'
import { navigate } from '../lib/navigation'

export function TodayPage({ entries, tags, onOpen, backupDue }: { entries: DictionaryEntry[]; tags: Tag[]; onOpen: (entry: DictionaryEntry) => void; backupDue: boolean }) {
  const todaySeed = new Date().toLocaleDateString('sv-SE')
  const todayEntries = useMemo(() => buildDiscoveryPage(entries, 'thoughtful', 3, seededRandom(todaySeed)), [entries, todaySeed])
  const recent = entries.slice(0, 4)
  const growing = entries.filter((entry) => entry.status === 'growing').slice(0, 3)

  if (entries.length === 0) {
    return (
      <main className="page page--today">
        <section className="hero">
          <div className="eyebrow">MY OWN DICTIONARY</div>
          <h1>私辞典</h1>
          <p>言葉を拾い、育て、忘れたころにまた開く。</p>
        </section>
        <QuickAdd compact />
        <EmptyState title="最初の一語を拾う">意味や出典は空欄で大丈夫。引っかかった形のまま置いておける。</EmptyState>
      </main>
    )
  }

  return (
    <main className="page page--today">
      <section className="hero hero--with-count">
        <div>
          <div className="eyebrow">TODAY'S LEAF</div>
          <h1>今日の頁</h1>
          <p>{entries.length.toLocaleString('ja-JP')}語のなかから、今日の三語。</p>
        </div>
        <div className="dictionary-count"><strong>{entries.length}</strong><span>entries</span></div>
      </section>
      {backupDue && <button className="backup-reminder" type="button" onClick={() => navigate('data')}><Icon name="download" /><span><strong>そろそろバックアップ</strong><small>言葉を端末の外にも残しておく</small></span><Icon name="arrow" /></button>}
      <div className="today-leaf paper-page">
        <div className="paper-page__rule"><span>{todaySeed.replaceAll('-', '.')}</span><span>私辞典</span></div>
        {todayEntries.map((entry, index) => (
          <button key={entry.id} className="today-entry" type="button" onClick={() => onOpen(entry)}>
            <span className="today-entry__number">0{index + 1}</span>
            <span className="today-entry__content">
              <span className="today-entry__reading">{entry.reading || ENTRY_TYPE_LABELS[entry.entryType]}</span>
              <strong>{entry.headword}</strong>
              <span>{entry.shortMeaning || entry.whySaved || '今日は、意味を決めずに眺める。'}</span>
            </span>
            <Icon name="arrow" />
          </button>
        ))}
        <div className="paper-page__folio">— {String(new Date().getDate()).padStart(3, '0')} —</div>
      </div>
      <QuickAdd compact />
      {growing.length > 0 && (
        <section className="section-block">
          <div className="section-heading"><div><div className="eyebrow">STILL GROWING</div><h2>育て途中</h2></div><button className="text-button" type="button" onClick={() => navigate('dictionary')}>すべて見る <Icon name="arrow" /></button></div>
          <div className="lined-list">{growing.map((entry) => <EntryRow key={entry.id} entry={entry} tags={tags} onOpen={() => onOpen(entry)} />)}</div>
        </section>
      )}
      <section className="section-block">
        <div className="section-heading"><div><div className="eyebrow">RECENTLY FOUND</div><h2>最近拾った言葉</h2></div></div>
        <div className="lined-list">{recent.map((entry) => <EntryRow key={entry.id} entry={entry} tags={tags} onOpen={() => onOpen(entry)} />)}</div>
      </section>
    </main>
  )
}
