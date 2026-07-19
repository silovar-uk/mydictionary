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
  const todayEntries = useMemo(() => buildDiscoveryPage(entries, 'thoughtful', 4, seededRandom(todaySeed)), [entries, todaySeed])
  const featured = todayEntries[0]
  const leafEntries = todayEntries.slice(1)
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
      <section className="today-intro">
        <div>
          <div className="eyebrow">TODAY'S ENCOUNTER</div>
          <h1>今日は、この言葉から。</h1>
        </div>
        <p>{entries.length.toLocaleString('ja-JP')}語のなかから、忘れかけた一語が戻ってきた。</p>
      </section>

      {featured && (
        <section className="today-cover" aria-label="今日の一語">
          <span className="today-cover__sheet today-cover__sheet--back" aria-hidden="true" />
          <span className="today-cover__sheet today-cover__sheet--middle" aria-hidden="true" />
          <button className="today-cover__face" type="button" onClick={() => onOpen(featured)}>
            <span className="today-cover__topline">
              <span>{todaySeed.replaceAll('-', '.')}</span>
              <span>NO. {String(entries.length).padStart(4, '0')}</span>
            </span>
            <span className="today-cover__seal" aria-hidden="true">私</span>
            <span className="today-cover__reading">{featured.reading || ENTRY_TYPE_LABELS[featured.entryType]}</span>
            <strong>{featured.headword}</strong>
            <span className="today-cover__meaning">{featured.shortMeaning || featured.whySaved || featured.encounterContext || 'まだ説明のない言葉。だから、もう一度ひらく。'}</span>
            <span className="today-cover__action">今日の一語をひらく <Icon name="arrow" /></span>
          </button>
        </section>
      )}

      {backupDue && <button className="backup-reminder" type="button" onClick={() => navigate('data')}><Icon name="download" /><span><strong>そろそろバックアップ</strong><small>言葉を端末の外にも残しておく</small></span><Icon name="arrow" /></button>}

      {leafEntries.length > 0 && (
        <section className="section-block section-block--today-leaf">
          <div className="section-heading"><div><div className="eyebrow">THE REST OF TODAY</div><h2>今日の余白</h2></div><small className="section-note">主役のそばにいた言葉</small></div>
          <div className="today-leaf paper-page">
            <div className="paper-page__rule"><span>{todaySeed.replaceAll('-', '.')}</span><span>私辞典</span></div>
            {leafEntries.map((entry, index) => (
              <button key={entry.id} className="today-entry" type="button" onClick={() => onOpen(entry)}>
                <span className="today-entry__number">0{index + 2}</span>
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
        </section>
      )}

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
