import { useEffect, useMemo, useState } from 'react'
import type { DictionaryEntry } from '../domain/types'
import { normalizeText } from '../domain/normalize'
import { buildReunionIndex, findMatchesInReunionIndex } from '../domain/reunion'
import { Icon } from './Icon'

interface Props {
  entries: readonly DictionaryEntry[]
  headword: string
  isComposing?: boolean
  onOpenPrevious: (entry: DictionaryEntry) => void
}

function captureDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '保存済み'
    : new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

/**
 * A hint, never a duplicate warning or a gate in the saving flow.
 * It reads its parent-provided local entries and performs no writes.
 */
export function ReunionRibbon({ entries, headword, isComposing = false, onOpenPrevious }: Props) {
  const index = useMemo(() => buildReunionIndex(entries), [entries])
  const normalized = normalizeText(headword)
  const [settledKey, setSettledKey] = useState('')
  const [dismissedKey, setDismissedKey] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setDismissedKey('')
    setExpanded(false)
  }, [normalized])

  useEffect(() => {
    if (isComposing || !normalized) {
      setSettledKey('')
      return
    }
    const timer = window.setTimeout(() => setSettledKey(normalized), 220)
    return () => window.clearTimeout(timer)
  }, [normalized, isComposing])

  // Never show results for a previous keystroke or for unfinished IME conversion.
  const ready = !isComposing && normalized && settledKey === normalized && dismissedKey !== normalized
  const candidates = ready ? findMatchesInReunionIndex(index, headword) : []
  if (candidates.length === 0) return null

  const shown = expanded ? candidates : candidates.slice(0, 3)
  const remaining = candidates.length - shown.length

  return (
    <aside className="reunion-ribbon" aria-label="以前の同表記の記録">
      <div className="reunion-ribbon__heading">
        <span className="reunion-ribbon__symbol" aria-hidden="true"><Icon name="clock" /></span>
        <div className="reunion-ribbon__heading-text">
          <div className="reunion-ribbon__eyebrow">A WORD, MET AGAIN</div>
          <strong>以前にも、この表記を拾っています</strong>
          <span className="reunion-ribbon__count" role="status">{candidates.length}件の記録</span>
        </div>
        <button className="reunion-ribbon__dismiss" type="button" onClick={() => setDismissedKey(normalized)} aria-label="以前の記録の案内を閉じる">
          <Icon name="close" />
        </button>
      </div>
      <p className="reunion-ribbon__note">
        同じ意味とは限りません。前の記録を見ても、今の言葉はそのまま新しく保存できます。
      </p>
      <div className="reunion-ribbon__list">
        {shown.map((candidate) => (
          <article className="reunion-ribbon__item" key={candidate.id}>
            <div className="reunion-ribbon__item-content">
              <span className="reunion-ribbon__date">{captureDate(candidate.createdAt)} に拾った</span>
              <strong>{candidate.headword}</strong>
              <p>{candidate.shortMeaning || candidate.whySaved || candidate.encounterContext || 'まだ一言メモのない記録'}</p>
              {candidate.sourceTitle && <span className="reunion-ribbon__source">出典：{candidate.sourceTitle}</span>}
            </div>
            <button className="reunion-ribbon__open" type="button" onClick={() => onOpenPrevious(candidate)}>
              前の記録を見る <Icon name="arrow" />
            </button>
          </article>
        ))}
      </div>
      {candidates.length > 3 && (
        <button
          type="button"
          className="reunion-ribbon__expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '最初の3件に戻す' : `ほかの記録も見る（${remaining}件）`}
          <Icon name="arrow" />
        </button>
      )}
    </aside>
  )
}
