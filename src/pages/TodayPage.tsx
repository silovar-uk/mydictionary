import { useMemo } from 'react'
import { QuickAdd } from '../components/QuickAdd'
import { EmptyState } from '../components/EmptyState'
import { EntryRow } from '../components/EntryRow'
import { Icon } from '../components/Icon'
import { buildDiscoveryPage } from '../domain/discovery'
import { getRecentlyAdded } from '../domain/recent'
import type { DictionaryEntry, Tag } from '../domain/types'
import { ENTRY_TYPE_LABELS } from '../domain/types'
import { seededRandom } from '../lib/format'
import { navigate } from '../lib/navigation'

interface Props {
  entries: DictionaryEntry[]
  tags: Tag[]
  onOpen: (entry: DictionaryEntry) => void
  onViewAllRecent: () => void
  backupDue: boolean
}

export function TodayPage({ entries, tags, onOpen, onViewAllRecent, backupDue }: Props) {
  const todaySeed = new Date().toLocaleDateString('sv-SE')
  const todayEntries = useMemo(() => buildDiscoveryPage(entries, 'thoughtful', 4, seededRandom(todaySeed)), [entries, todaySeed])
  const featured = todayEntries[0]
  const leafEntries = todayEntries.slice(1)
  const recent = useMemo(() => getRecentlyAdded(entries, 5), [entries])
  const growing = entries.filter((entry) => entry.status === 'growing').slice(0, 3)

  if (entries.length === 0) {
    return (
      <main className="page page--today">
        <section className="hero">
          <div className="eyebrow">MY OWN DICTIONARY</div>
          <h1>私辞典</h1>
          <p>言葉を拾い、育て、忘れたころにまた開く。</p>
        </section>
        <QuickAdd compact entries={entries} onOpenPrevious={onOpen} />
        <EmptyState title="最初の一語を拾う">意味や出典は空欄で大丈夫。引っかかった形のまま置いておける。</EmptyState>
      </main>
    )
  }

  return (
    <main className="page page--today">
      <header className="today-intro today-intro--practical">
        <div>
          <div className="eyebrow">YOUR WORDS</div>
          <h1>今日の書斎</h1>
        </div>
        <p><strong>{entries.length.toLocaleString('ja-JP')}</strong> 語の記録</p>
      </header>

      <div className="today-workspace">
        <section className="today-recent" aria-labelledby="today-recent-heading">
          <header className="today-recent__heading">
            <div>
              <div className="eyebrow">RECENTLY ADDED</div>
              <h2 id="today-recent-heading">最近追加した言葉</h2>
              <p>追加した順に、すぐ開ける。</p>
            </div>
            <button className="today-recent__all" type="button" onClick={onViewAllRecent}>
              すべて見る <Icon name="arrow" />
            </button>
          </header>
          <div className="lined-list today-recent__list">
            {recent.map((entry) => <EntryRow key={entry.id} entry={entry} tags={tags} onOpen={() => onOpen(entry)} />)}
          </div>
        </section>

        <aside className="today-workspace__aside" aria-label="今日の一語と言葉の登録">
          {featured && (
            <section className="today-feature" aria-label="今日の一語">
              <div className="today-feature__heading">
                <span className="eyebrow">TODAY'S WORD</span>
                <span>{todaySeed.replaceAll('-', '.')}</span>
              </div>
              <button className="today-feature__card" type="button" onClick={() => onOpen(featured)}>
                <span className="today-feature__reading">{featured.reading || ENTRY_TYPE_LABELS[featured.entryType]}</span>
                <strong>{featured.headword}</strong>
                <span className="today-feature__meaning">{featured.shortMeaning || featured.whySaved || featured.encounterContext || '忘れていた言葉を、もう一度。'}</span>
                <span className="today-feature__action">この言葉をひらく <Icon name="arrow" /></span>
              </button>
            </section>
          )}
          <QuickAdd compact entries={entries} onOpenPrevious={onOpen} />
          {growing.length > 0 && (
            <section className="section-block today-workspace__growing">
              <div className="section-heading">
                <div><div className="eyebrow">STILL GROWING</div><h2>育て途中</h2></div>
                <button className="text-button" type="button" onClick={() => navigate('dictionary')}>すべて見る <Icon name="arrow" /></button>
              </div>
              <div className="lined-list">
                {growing.map((entry) => <EntryRow key={entry.id} entry={entry} tags={tags} onOpen={() => onOpen(entry)} />)}
              </div>
            </section>
          )}
        </aside>
      </div>

      {backupDue && (
        <button className="backup-reminder" type="button" onClick={() => navigate('data')}>
          <Icon name="download" />
          <span><strong>そろそろバックアップ</strong><small>言葉を端末の外にも残しておく</small></span>
          <Icon name="arrow" />
        </button>
      )}

      {leafEntries.length > 0 && (
        <section className="section-block section-block--today-leaf">
          <div className="section-heading">
            <div><div className="eyebrow">THE REST OF TODAY</div><h2>今日の余白</h2></div>
            <small className="section-note">主役のそばにいた言葉</small>
          </div>
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
    </main>
  )
}
