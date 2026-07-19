import { useRef, useState } from 'react'
import { createEntry } from '../services/entries'
import { splitTags } from '../domain/normalize'
import { navigate } from '../lib/navigation'
import { Icon } from './Icon'

interface Props {
  compact?: boolean
  onSaved?: (id: string) => void
}

export function QuickAdd({ compact = false, onSaved }: Props) {
  const [headword, setHeadword] = useState('')
  const [memo, setMemo] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  async function save(continueAdding = false) {
    if (!headword.trim() || saving) return
    setSaving(true)
    setMessage('')
    try {
      const entry = await createEntry({
        headword,
        shortMeaning: memo,
        tagNames: splitTags(tags)
      })
      setHeadword('')
      setMemo('')
      setTags('')
      setMessage('拾いました')
      onSaved?.(entry.id)
      if (continueAdding) {
        requestAnimationFrame(() => inputRef.current?.focus())
      } else {
        navigate('dictionary')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`quick-add paper-panel ${compact ? 'quick-add--compact' : ''}`} aria-labelledby="quick-add-title">
      <div className="eyebrow">CAPTURE</div>
      <h2 id="quick-add-title">言葉を拾う</h2>
      <p className="muted">見出し語だけでも保存できる。整理はあとで。</p>
      <label className="field">
        <span>言葉・文章</span>
        <textarea
          ref={inputRef}
          value={headword}
          onChange={(event) => setHeadword(event.target.value)}
          placeholder="気になった言葉を、そのまま"
          rows={compact ? 2 : 3}
          maxLength={10_000}
          autoFocus={!compact}
        />
      </label>
      <label className="field">
        <span>一言メモ <small>任意</small></span>
        <input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="なぜ引っかかった？" />
      </label>
      {!compact && (
        <label className="field">
          <span>タグ <small>任意</small></span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="企画, 読書, 言葉遣い" />
        </label>
      )}
      <div className="action-row">
        <button className="button button--primary" type="button" onClick={() => void save(false)} disabled={!headword.trim() || saving}>
          <Icon name="plus" /> {saving ? '保存中…' : '拾う'}
        </button>
        {!compact && (
          <button className="button button--ghost" type="button" onClick={() => void save(true)} disabled={!headword.trim() || saving}>
            続けて拾う
          </button>
        )}
      </div>
      <div className="status-message" aria-live="polite">{message}</div>
    </section>
  )
}
