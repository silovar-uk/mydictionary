import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * The site is an offline-first PWA. An existing tab may keep an old
 * service-worker-controlled app alive after GitHub Pages has deployed a
 * new version. Show a user-controlled update prompt instead of silently
 * reloading an open entry editor.
 */
export function AppUpdateNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | undefined>()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_url, registered) {
      setRegistration(registered)
    }
  })

  useEffect(() => {
    if (!registration) return
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible' && navigator.onLine !== false) {
        void registration.update().catch(() => {
          // Network errors are transient; keep the current offline version.
        })
      }
    }
    const onVisibilityChange = () => checkForUpdate()
    window.addEventListener('focus', checkForUpdate)
    window.addEventListener('online', checkForUpdate)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const interval = window.setInterval(checkForUpdate, 60 * 60 * 1000)
    checkForUpdate()
    return () => {
      window.removeEventListener('focus', checkForUpdate)
      window.removeEventListener('online', checkForUpdate)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(interval)
    }
  }, [registration])

  if (!needRefresh) return null

  return (
    <aside className="app-update-notice" role="status" aria-live="polite" aria-label="アプリの更新">
      <div className="app-update-notice__message">
        <strong>私辞典が新しくなりました</strong>
        <span>入力中の内容があれば、先に保存してから更新してください。登録済みの言葉は消えません。</span>
      </div>
      <div className="app-update-notice__actions">
        <button className="app-update-notice__primary" type="button" onClick={() => void updateServiceWorker(true)}>
          更新して開く
        </button>
        <button className="app-update-notice__later" type="button" onClick={() => setNeedRefresh(false)}>
          あとで
        </button>
      </div>
    </aside>
  )
}
