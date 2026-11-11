import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { DictionaryEntry, Tag } from '../domain/types'
import type { Route } from '../lib/navigation'
import { searchEntries } from '../services/search'
import { Icon } from './Icon'

type IconName = Parameters<typeof Icon>[0]['name']

interface PaletteAction {
  key: string
  label: string
  detail: string
  icon: IconName
  run: () => void
}

interface Props {
  open: boolean
  entries: DictionaryEntry[]
  tags: Tag[]
  onClose: () => void
  onNavigate: (route: Route) => void
  onOpenEntry: (entry: DictionaryEntry) => void
  onSearch: (query: string) => void
  onAdd: (headword: string) => void
}

/** Native dialog supplies focus containment, Escape and focus restoration. */
export function CommandPalette({ open, entries, tags, onClose, onNavigate, onOpenEntry, onSearch, onAdd }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  const hits = useMemo(
    () => query.trim()
      ? searchEntries(entries, tags, query).slice(0, 7).map(({ entry, reason }) => ({ entry, reason }))
      : [...entries]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 4)
          .map((entry) => ({ entry, reason: '最近の言葉' })),
    [entries, tags, query]
  )

  const actions: PaletteAction[] = query.trim()
    ? [
        { key: 'search-all', label: `「${query.trim()}」を辞典で検索`, detail: '検索結果をすべて見る', icon: 'search', run: () => onSearch(query.trim()) },
        { key: 'capture', label: `「${query.trim()}」を新しく追加`, detail: '新しい言葉として残す', icon: 'plus', run: () => onAdd(query.trim()) }
      ]
    : [
        { key: 'capture', label: '新しい言葉を追加', detail: '見出し語だけでも保存できる', icon: 'plus', run: () => onAdd('') },
        { key: 'dictionary', label: '辞典をひらく', detail: 'すべての言葉から探す', icon: 'book', run: () => onNavigate('dictionary') },
        { key: 'open', label: '偶然の一頁をひらく', detail: '忘れていた言葉と再会する', icon: 'shuffle', run: () => onNavigate('open') },
        { key: 'today', label: '今日の書斎へ', detail: '今日の一語を見る', icon: 'home', run: () => onNavigate('today') },
        { key: 'data', label: '同期とバックアップ', detail: '大切な言葉を守る', icon: 'database', run: () => onNavigate('data') }
      ]

  const optionCount = hits.length + actions.length

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      setQuery('')
      setSelected(0)
      inputRef.current?.focus()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  function closeAndRun(action: () => void) {
    dialogRef.current?.close()
    onClose()
    action()
  }

  function chooseOption(index: number) {
    if (index < hits.length) {
      const hit = hits[index]
      if (hit) closeAndRun(() => onOpenEntry(hit.entry))
    } else {
      const action = actions[index - hits.length]
      if (action) closeAndRun(action.run)
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((current) => (current + 1) % Math.max(optionCount, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((current) => (current - 1 + Math.max(optionCount, 1)) % Math.max(optionCount, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      chooseOption(Math.min(selected, optionCount - 1))
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="command-palette"
      aria-label="私辞典の検索と移動"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="command-palette__surface">
        <div className="command-palette__search">
          <Icon name="search" />
          <input
            ref={inputRef}
            aria-label="言葉・意味・出典・操作を検索"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelected(0) }}
            onKeyDown={onInputKeyDown}
            placeholder="言葉、意味、出典から探す…"
            autoComplete="off"
          />
          <button className="command-palette__close" type="button" onClick={onClose} aria-label="検索を閉じる">
            <Icon name="close" />
          </button>
        </div>
        <div className="command-palette__body">
          <div className="command-palette__heading">{query.trim() ? `言葉の候補（${hits.length}件表示）` : '最近触れた言葉'}</div>
          {hits.length > 0 ? hits.map(({ entry, reason }, index) => (
            <button
              key={entry.id}
              type="button"
              className={`command-palette__option ${selected === index ? 'is-selected' : ''}`}
              onMouseEnter={() => setSelected(index)}
              onClick={() => chooseOption(index)}
            >
              <span className="command-palette__option-mark"><Icon name="book" /></span>
              <span className="command-palette__option-text">
                <strong>{entry.headword}</strong>
                <small>{entry.shortMeaning || reason || '言葉をひらく'}</small>
              </span>
              <span className="command-palette__option-action">開く</span>
            </button>
          )) : <div className="command-palette__empty">一致する言葉はまだない。新しい一語として拾えるよ。</div>}
          <div className="command-palette__heading">操作</div>
          {actions.map((action, index) => {
            const optionIndex = hits.length + index
            return (
              <button
                key={action.key}
                type="button"
                className={`command-palette__option ${selected === optionIndex ? 'is-selected' : ''}`}
                onMouseEnter={() => setSelected(optionIndex)}
                onClick={() => chooseOption(optionIndex)}
              >
                <span className="command-palette__option-mark"><Icon name={action.icon} /></span>
                <span className="command-palette__option-text">
                  <strong>{action.label}</strong>
                  <small>{action.detail}</small>
                </span>
                <span className="command-palette__option-action">移動</span>
              </button>
            )
          })}
        </div>
        <footer className="command-palette__footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> 選択　<kbd>Enter</kbd> 開く</span>
          <span><kbd>Esc</kbd> 閉じる</span>
        </footer>
      </div>
    </dialog>
  )
}
