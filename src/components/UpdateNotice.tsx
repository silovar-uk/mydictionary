import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateNotice() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return <div className="update-notice"><span>新しい版があります。</span><button type="button" onClick={() => void updateServiceWorker(true)}>更新する</button><button type="button" onClick={() => setNeedRefresh(false)}>あとで</button></div>
}
