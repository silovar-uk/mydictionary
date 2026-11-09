import { useEffect, useState } from 'react'
import { SyncIndicator } from './components/SyncPanel'
import { AppUpdateNotice } from './components/AppUpdateNotice'
import { CommandPalette } from './components/CommandPalette'
import { capturePairLink, startAutoSync } from './services/sync'
import { EntrySheet } from './components/EntrySheet'
import { Icon } from './components/Icon'
import { db } from './db/database'
import type { DictionaryEntry } from './domain/types'
import { useDictionaryData } from './hooks/useDictionaryData'
import { clearAddContext, readDictionaryViewState, startAddFromDictionary, updateDictionaryViewState } from './lib/dictionaryJourney'
import { navigate, type Route, useRoute } from './lib/navigation'
import { AddPage } from './pages/AddPage'
import { DataPage } from './pages/DataPage'
import { DictionaryPage } from './pages/DictionaryPage'
import { OpenPage } from './pages/OpenPage'
import { TodayPage } from './pages/TodayPage'

export default function App() {
  const route = useRoute()
  useEffect(() => { if (capturePairLink()) navigate('data'); return startAutoSync() }, [])
  const { entries, tags, loading } = useDictionaryData()
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState(() => readDictionaryViewState().query)
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

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (!paletteOpen && document.querySelector('.sheet-backdrop')) return
        event.preventDefault()
        setPaletteOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [paletteOpen])

  function searchFromPalette(value: string) {
    changeQuery(value)
    navigate('dictionary')
  }

  function addFromPalette(headword: string) {
    if (headword) startAddFromDictionary('', headword)
    else clearAddContext()
    navigate('add')
  }

  function openEntry(entry: DictionaryEntry) {
    setSelectedEntry(entry)
  }

  function viewRecentlyAdded() {
    setQuery('')
    updateDictionaryViewState({ query: '', status: 'all', sort: 'created', scrollY: 0 })
    navigate('dictionary')
  }

  function changeQuery(value: string) {
    setQuery(value)
    updateDictionaryViewState({ query: value })
  }

  function goTo(routeToOpen: Route) {
    if (routeToOpen === 'add') {
      if (route === 'dictionary') startAddFromDictionary(query)
      else clearAddContext()
    }
    navigate(routeToOpen)
  }

  const navItems: { route: Route; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
    { route: 'today', label: '今日', icon: 'home' },
    { route: 'dictionary', label: '辞典', icon: 'book' },
    { route: 'add', label: '拾う', icon: 'plus' },
    { route: 'open', label: '開く', icon: 'shuffle' },
    { route: 'data', label: 'データ', icon: 'database' }
  ]

  return (
    <div className={`app-shell app-shell--${route}`}>
      <a className="skip-link" href="#main-content">本文へ移動</a>
      <aside className="desktop-rail" aria-label="私辞典のメニュー">
        <div className="desktop-rail__brand"><span className="desktop-rail__mark">私</span><span><strong>私辞典</strong><small>MY WORDS, MY WORLD</small></span></div>
        <button className="desktop-rail__capture" type="button" onClick={() => goTo('add')}>
          <Icon name="plus" /> 言葉を拾う
        </button>
        <div className="desktop-rail__group-label">書斎</div>
        <nav className="desktop-rail__nav" aria-label="デスクトップのメインメニュー">
          {navItems.filter((item) => item.route !== 'add').map((item) => (
            <button key={item.route} type="button" aria-current={route === item.route ? 'page' : undefined} className={route === item.route ? 'is-active' : ''} onClick={() => goTo(item.route)}>
              <Icon name={item.icon} /><span>{item.label}</span>
              {item.route === 'dictionary' && <small>{entries.length}</small>}
            </button>
          ))}
        </nav>
        <div className="desktop-rail__footer">
          <button className="desktop-rail__quickfind" type="button" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" /> すばやく探す <kbd>Ctrl K</kbd>
          </button>
          <p>拾って、育てて、また出会う。</p>
        </div>
      </aside>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate('today')}><span className="brand__mark">私</span><span>私辞典</span></button>
        <button className="top-search" type="button" onClick={() => setPaletteOpen(true)} aria-label="言葉や操作をすばやく検索"><Icon name="search" /><span>{query || '言葉・意味・出典をすばやく検索'}</span><kbd>Ctrl K</kbd></button>
        <SyncIndicator onOpen={() => navigate('data')} />
      </header>
      <div id="main-content" tabIndex={-1}>
      {loading ? <div className="loading-page"><div className="book-loader">辞</div><span>頁をひらいています</span></div> : (
        <>
          {route === 'today' && <TodayPage entries={entries} tags={tags} onOpen={openEntry} onViewAllRecent={viewRecentlyAdded} backupDue={backupDue} />}
          {route === 'dictionary' && <DictionaryPage entries={entries} tags={tags} initialQuery={query} onQueryChange={changeQuery} onOpen={openEntry} />}
          {route === 'add' && <AddPage entries={entries} onOpen={openEntry} />}
          {route === 'open' && <OpenPage entries={entries} tags={tags} onOpen={openEntry} />}
          {route === 'data' && <DataPage entries={entries} tags={tags} />}
        </>
      )}
      </div>
      <nav className="bottom-nav" aria-label="メインメニュー">
        {navItems.map((item) => <button key={item.route} className={`${route === item.route ? 'is-active' : ''} ${item.route === 'add' ? 'bottom-nav__add' : ''}`} type="button" aria-current={route === item.route ? 'page' : undefined} onClick={() => goTo(item.route)}><span><Icon name={item.icon} /></span><small>{item.label}</small></button>)}
      </nav>
      <CommandPalette open={paletteOpen} entries={entries} tags={tags} onClose={() => setPaletteOpen(false)} onNavigate={goTo} onOpenEntry={openEntry} onSearch={searchFromPalette} onAdd={addFromPalette} />
      <AppUpdateNotice />
      {selectedEntry && <EntrySheet entry={selectedEntry} tags={tags} onClose={() => setSelectedEntry(null)} onChanged={(changed) => { if (changed) setSelectedEntry(changed) }} />}
    </div>
  )
}
