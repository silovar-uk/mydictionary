import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { EntryRow } from '../components/EntryRow'
import { Icon } from '../components/Icon'
import { buildDiscoveryPage } from '../domain/discovery'
import { getRecentlyAdded } from '../domain/recent'
import type { DictionaryEntry, Tag } from '../domain/types'
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
  const [randomIndex, setRandomIndex] = useState(0)
  const activeEntries = useMemo(() => entries.filter((entry) => !entry.deletedAt), [entries])
  const randomCandidates = useMemo(
    () => buildDiscoveryPage(activeEntries, 'thoughtful', Math.min(activeEntries.length, 20), seededRandom(todaySeed)),
    [activeEntries, todaySeed]
  )
  const featured = randomCandidates[randomIndex % randomCandidates.length]
  const recent = useMemo(() => getRecentlyAdded(entries, 5), [entries])
  const growing = activeEntries.filter((entry) => entry.status === 'growing').slice(0, 3)

  if (activeEntries.length === 0) {
    return (
      <main className="page page--today">
        <header className="today-intro today-intro--practical">
          <div><div className="eyebrow">YOUR WORDS</div><h1>私辞典</h1></div>
        </header>
        <section className="today-empty">
          <EmptyState title="最初の言葉を追加">名前だけでも保存できます。よみとひとことは、あとからでも追加できます。</EmptyState>
          <button className="button button--primary" type="button" onClick={() => navigate('add')}><Icon name="plus" /> 追加する</button>
        </section>
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
        <p><strong>{activeEntries.length.toLocaleString('ja-JP')}</strong> 語の記録</p>
      </header>

      {featured && (
        <section className="today-random" aria-label="再会した言葉">
          <span className="today-random__label"><Icon name="shuffle" /> 再会</span>
          <button className="today-random__word" type="button" onClick={() => onOpen(featured)} title="この言葉の記録を開く">
            <strong aria-live="polite">{featured.headword}</strong>
            <span>{featured.shortMeaning || featured.reading || ''}</span>
            <Icon name="arrow" />
          </button>
          <button
            className="today-random__refresh"
            type="button"
            onClick={() => setRandomIndex((index) => index + 1)}
            disabled={randomCandidates.length < 2}
            aria-label="別の言葉をランダム表示"
            title="別の言葉を表示"
          ><Icon name="shuffle" /></button>
        </section>
      )}

      <div className={growing.length > 0 ? 'today-workspace' : 'today-workspace today-workspace--single'}>
        <section className="today-recent" aria-labelledby="today-recent-heading">
          <header className="today-recent__heading">
            <div>
              <div className="eyebrow">RECENTLY ADDED</div>
              <h2 id="today-recent-heading">最近追加した言葉</h2>
            </div>
            <button className="today-recent__all" type="button" onClick={onViewAllRecent}>
              すべて見る <Icon name="arrow" />
            </button>
          </header>
          <div className="lined-list today-recent__list">
            {recent.map((entry) => <EntryRow key={entry.id} entry={entry} tags={tags} onOpen={() => onOpen(entry)} />)}
          </div>
        </section>

        {growing.length > 0 && (
          <aside className="today-workspace__aside" aria-label="育て途中の言葉">
            <section className="section-block today-workspace__growing">
              <div className="section-heading">
                <div><div className="eyebrow">STILL GROWING</div><h2>育て途中</h2></div>
                <button className="text-button" type="button" onClick={() => navigate('dictionary')}>辞典へ <Icon name="arrow" /></button>
              </div>
              <div className="lined-list">
                {growing.map((entry) => <EntryRow key={entry.id} entry={entry} tags={tags} onOpen={() => onOpen(entry)} />)}
              </div>
            </section>
          </aside>
        )}
      </div>

      {backupDue && (
        <button className="backup-reminder" type="button" onClick={() => navigate('data')}>
          <Icon name="download" />
          <span><strong>そろそろバックアップ</strong><small>言葉を端末の外にも残しておく</small></span>
          <Icon name="arrow" />
        </button>
      )}
    </main>
  )
}
