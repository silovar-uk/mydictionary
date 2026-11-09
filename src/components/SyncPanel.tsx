import { useEffect, useState } from 'react'
import { createBackup, backupToJson, downloadText } from '../services/transfer'
import {
  disconnectSync, discardPair, enableNewSync, getPairUrl, getSyncMeta, joinPairedSync,
  pendingPair, subscribeSync, syncNow, SyncConflictError,
  type SyncConflict, type SyncMeta
} from '../services/sync'

export function useSyncMeta(): SyncMeta {
  const [meta, setMeta] = useState(getSyncMeta)
  useEffect(() => subscribeSync(() => setMeta(getSyncMeta())), [])
  return meta
}
function stamp(value: string): string {
  return value ? new Date(value).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'まだ同期していません'
}
export function SyncIndicator({ onOpen }: { onOpen: () => void }) {
  const meta = useSyncMeta()
  if (!meta.enabled && !pendingPair()) return null
  const label = meta.phase === 'ok' ? '同期済み' :
    meta.phase === 'syncing' ? '同期中' :
    meta.phase === 'pending' ? '同期待ち' : '同期を確認'
  return <button type="button" className={'sync-indicator sync-indicator--' + meta.phase}
    onClick={onOpen} title={label + '・タップして確認'} aria-label={label + '。同期設定を開く'}>
    <span aria-hidden="true" className="sync-indicator__dot" /><span>{label}</span>
  </button>
}
export function SyncPanel({ count }: { count: number }) {
  const meta = useSyncMeta()
  const [pair, setPair] = useState(pendingPair)
  const [showLink, setShowLink] = useState(false)
  const [pairUrl, setPairUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [choices, setChoices] = useState<Record<string, 'local' | 'remote'>>({})

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      setConflicts([])
      setMessage('同期できました。ほかの端末でも同じ言葉を開けます。')
    } catch (error) {
      if (error instanceof SyncConflictError) {
        setConflicts(error.conflicts)
        setMessage('変更が重なった項目があります。残したい内容を選んでください。')
      } else {
        setMessage(error instanceof Error ? error.message : '同期に失敗しました。')
      }
    } finally { setBusy(false) }
  }

  function showPairLink() {
    try { setPairUrl(getPairUrl()); setShowLink(true) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'リンクを作れませんでした。') }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pairUrl)
      setMessage('連携リンクをコピーしました。自分の端末だけに共有してください。')
    } catch { setMessage('コピーできませんでした。下のリンクを選択してコピーしてください。') }
  }

  function cancelPair() { discardPair(); setPair(false); setMessage('端末連携を取り消しました。') }

  return (
    <section className="sync-panel paper-panel" aria-labelledby="sync-panel-title">
      <div className="sync-panel__head">
        <div><div className="eyebrow">YOUR WORDS, EVERYWHERE</div><h2 id="sync-panel-title">端末間同期</h2></div>
        <span className={'sync-panel__status sync-panel__status--' + meta.phase} aria-live="polite">
          {meta.phase === 'off' ? 'この端末に保存' : meta.phase === 'ok' ? '● 同期済み' :
            meta.phase === 'syncing' ? '同期中…' : meta.phase === 'pending' ? '● 同期待ち' :
            meta.phase === 'conflict' ? '要確認' : '同期エラー'}
        </span>
      </div>
      {pair ? (
        <div className="sync-panel__main">
          <p>別の端末から届いた連携リンクです。<strong>この端末の言葉は消さずに統合します。</strong></p>
          <div className="sync-panel__actions">
            <button type="button" className="button button--primary" disabled={busy}
              onClick={() => void run(async () => { await joinPairedSync(); setPair(false) })}>
              {busy ? '連携中…' : 'この端末を連携する'}
            </button>
            <button type="button" className="button button--ghost" disabled={busy} onClick={cancelPair}>やめる</button>
          </div>
          {meta.enabled && <p className="sync-panel__hint">現在の端末の同期設定を切り替えます。内容は保持されます。</p>}
        </div>
      ) : !meta.enabled ? (
        <div className="sync-panel__main">
          <p>PCで拾った言葉をスマホでも。普段の保存先はこの端末のまま、暗号化して自動で同期します。</p>
          <button type="button" className="button button--primary" disabled={busy}
            onClick={() => void run(async () => { enableNewSync(); await syncNow() })}>
            {busy ? '準備中…' : '同期をはじめる'}
          </button>
          <p className="sync-panel__hint">ログイン不要。同期先の暗号化データは連携キーを持つ端末だけが読めます。</p>
        </div>
      ) : (
        <div className="sync-panel__main">
          <p>{count}件の言葉をこの端末で利用できます。変更は自動で同期されます。</p>
          <p className="sync-panel__hint">最終同期：{stamp(meta.lastSyncedAt)}
            {meta.lastError ? ' / ' + meta.lastError : ''}
          </p>
          <div className="sync-panel__actions">
            <button type="button" className="button button--primary" disabled={busy || meta.phase === 'syncing'}
              onClick={() => void run(() => syncNow())}>{busy || meta.phase === 'syncing' ? '同期中…' : '今すぐ同期'}</button>
            <button type="button" className="button button--ghost" onClick={showPairLink}>別の端末を追加</button>
          </div>
          {showLink && (
            <div className="sync-panel__pair">
              <strong>別の端末を連携</strong>
              <p>連携リンクには辞典を開くための秘密鍵が含まれます。公開投稿や他人との共有はしないでください。</p>
              <textarea value={pairUrl} readOnly rows={3} aria-label="自分の端末に送る連携リンク"
                onFocus={(event) => event.currentTarget.select()} />
              <div className="sync-panel__actions">
                <button type="button" className="button button--primary" onClick={() => void copyLink()}>リンクをコピー</button>
                {typeof navigator.share === 'function' && <button type="button" className="button button--ghost"
                  onClick={() => void navigator.share({ title: '私辞典の端末連携', url: pairUrl }).catch(() => undefined)}>共有</button>}
                <button type="button" className="button button--ghost" onClick={() => setShowLink(false)}>閉じる</button>
              </div>
            </div>
          )}
          <details className="sync-panel__details">
            <summary>この端末の連携を解除</summary>
            <p>解除しても、この端末の言葉は消えません。ほかの端末や共有データにも影響しません。</p>
            <button type="button" className="button button--ghost" disabled={busy} onClick={() => {
              if (!window.confirm('この端末の同期設定だけ解除しますか？言葉は消えません。')) return
              void disconnectSync().then(() => setMessage('連携を解除しました。')).catch((e: unknown) =>
                setMessage(e instanceof Error ? e.message : '解除できませんでした。'))
            }}>連携を解除する</button>
          </details>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="sync-panel__conflicts">
          <h3>どちらの変更を残しますか？</h3>
          <p>他方の変更を黙って上書きしないため、確認しています。</p>
          {conflicts.map((conflict) => (
            <fieldset key={conflict.key} className="sync-panel__conflict">
              <legend>{conflict.label} ・ {conflict.field}</legend>
              {(['local', 'remote'] as const).map((side) => <label key={side}>
                <input type="radio" name={conflict.key} checked={(choices[conflict.key] || 'local') === side}
                  onChange={() => setChoices((current) => ({ ...current, [conflict.key]: side }))} />
                <span>{side === 'local' ? 'この端末' : '共有側'}：{JSON.stringify(conflict[side])?.slice(0, 180) || '空欄'}</span>
              </label>)}
            </fieldset>
          ))}
          <button type="button" className="button button--primary" disabled={busy}
            onClick={() => void run(() => syncNow(Object.fromEntries(conflicts.map((c) => [c.key, choices[c.key] || 'local']))))}>
            選択した内容で同期
          </button>
        </div>
      )}
      <div className="sync-panel__footer">
        <span>保存はオフラインでも継続します。</span>
        <button type="button" className="sync-panel__backup" onClick={() => void createBackup().then((backup) =>
          downloadText('watashi-jiten_backup_' + new Date().toISOString().slice(0, 10) + '.json',
            backupToJson(backup), 'application/json;charset=utf-8')).then(() => setMessage('バックアップを書き出しました。')).catch(() =>
              setMessage('バックアップを書き出せませんでした。'))}>安全のためバックアップ</button>
      </div>
      {message && <p className="sync-panel__message" role="status">{message}</p>}
    </section>
  )
}
