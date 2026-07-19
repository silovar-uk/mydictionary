import { useEffect, useState } from 'react'
import { EntrySheet } from './components/EntrySheet'
import { Icon } from './components/Icon'
import { UpdateNotice } from './components/UpdateNotice'
import { db } from './db/database'
import type { DictionaryEntry } from './domain/types'
import { useDictionaryData } from './hooks/useDictionaryData'
import { navigate, type Route, useRoute } from './lib/navigation'
import { AddPage } from './pages/AddPage'
import { DataPage } from './pages/DataPage'
import { DictionaryPage } from './pages/DictionaryPage'
import { OpenPage } from './pages/OpenPage'
import { TodayPage } from './pages/TodayPage'

export default function App() {
  const route = useRoute()
  const { entries, tags, loading } = useDictionaryData()
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null)
  const [query, setQuery] = useState('')
  const [backupDue, setBackupDue] = useState(false)

  useEffect(() => {
    if (entries.length < 10) {
      setBackupDue(false)
      return
    }
    void db.settings.get('lastBackupAt').then((record) => {
      const last = typeof record?.value === 'string' ? new Date(record.value).getTime() : 0
      const sevenDays = 7 * 86_400_000
      setBackupDue(entries.length >= 20 && (!last || Date.now() - last > sevenDays))
    })
    void db.settings.get('persistenceRequested').then(async (record) => {
      if (record || !navigator.storage?.persist) return
      const granted = await navigator.storage.persist()
      await db.settings.put({ key: 'persistenceRequested', value: { granted, requestedAt: new Date().toISOString() } })
    })
  }, [entries])

  function openEntry(entry: DictionaryEntry) {
    setSelectedEntry(entry)
  }

  const navItems: { route: Route; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
    { route: 'today', label: '今日', icon: 'home' },
    { route: 'dictionary', label: '辞典', icon: 'book' },
    { route: 'add', label: '拾う', icon: 'plus' },
    { route: 'open', label: '開く', icon: 'shuffle' },
    { route: 'data', label: 'データ', icon: 'database' }
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate('today')}><span className="brand__mark">私</span><span>私辞典</span></button>
        <button className="top-search" type="button" onClick={() => navigate('dictionary')}><Icon name="search" /><span>{query || '辞典を検索'}</span></button>
      </header>
      {loading ? <div className="loading-page"><div className="book-loader">辞</div><span>頁をひらいています</span></div> : (
        <>
          {route === 'today' && <TodayPage entries={entries} tags={tags} onOpen={openEntry} backupDue={backupDue} />}
          {route === 'dictionary' && <DictionaryPage entries={entries} tags={tags} initialQuery={query} onQueryChange={setQuery} onOpen={openEntry} />}
          {route === 'add' && <AddPage />}
          {route === 'open' && <OpenPage entries={entries} tags={tags} onOpen={openEntry} />}
          {route === 'data' && <DataPage entries={entries} tags={tags} />}
        </>
      )}
      <nav className="bottom-nav" aria-label="メインメニュー">
        {navItems.map((item) => <button key={item.route} className={`${route === item.route ? 'is-active' : ''} ${item.route === 'add' ? 'bottom-nav__add' : ''}`} type="button" onClick={() => navigate(item.route)}><span><Icon name={item.icon} /></span><small>{item.label}</small></button>)}
      </nav>
      {selectedEntry && <EntrySheet entry={selectedEntry} tags={tags} onClose={() => setSelectedEntry(null)} onChanged={(changed) => { if (changed) setSelectedEntry(changed) }} />}
      <UpdateNotice />
    </div>
  )
}
