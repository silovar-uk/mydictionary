import type { EntryFormState } from '../components/EntryFormFields'

export type DictionaryStatusFilter = 'all' | 'captured' | 'growing' | 'owned' | 'favorite'
export type DictionarySort = 'updated' | 'created' | 'headword' | 'viewed'

export interface DictionaryViewState {
  query: string
  status: DictionaryStatusFilter
  sort: DictionarySort
  scrollY: number
}

export interface AddContext {
  fromDictionary: boolean
  query: string
  prefillHeadword: string
}

export interface DictionarySaveFlash {
  entryId: string
  message: string
  createdAt: number
}

interface AddDraft {
  form: EntryFormState
  savedAt: number
}

const VIEW_STATE_KEY = 'mydictionary.dictionaryViewState'
const ADD_CONTEXT_KEY = 'mydictionary.addContext'
const SAVE_FLASH_KEY = 'mydictionary.dictionarySaveFlash'
const ADD_DRAFT_KEY = 'mydictionary.addDraft'

const DEFAULT_VIEW_STATE: DictionaryViewState = {
  query: '',
  status: 'all',
  sort: 'updated',
  scrollY: 0
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const value = storage.getItem(key)
    return value ? JSON.parse(value) as T : null
  } catch {
    return null
  }
}

function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in private browsing. The app should still work.
  }
}

function remove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // Ignore unavailable storage.
  }
}

export function readDictionaryViewState(): DictionaryViewState {
  const stored = readJson<Partial<DictionaryViewState>>(window.sessionStorage, VIEW_STATE_KEY)
  return { ...DEFAULT_VIEW_STATE, ...stored }
}

export function updateDictionaryViewState(next: Partial<DictionaryViewState>): DictionaryViewState {
  const value = { ...readDictionaryViewState(), ...next }
  writeJson(window.sessionStorage, VIEW_STATE_KEY, value)
  return value
}

export function startAddFromDictionary(query: string, prefillHeadword = ''): void {
  writeJson<AddContext>(window.sessionStorage, ADD_CONTEXT_KEY, {
    fromDictionary: true,
    query,
    prefillHeadword
  })
}

export function readAddContext(): AddContext | null {
  return readJson<AddContext>(window.sessionStorage, ADD_CONTEXT_KEY)
}

export function clearAddContext(): void {
  remove(window.sessionStorage, ADD_CONTEXT_KEY)
}

export function setDictionarySaveFlash(entryId: string, message = '保存しました'): void {
  writeJson<DictionarySaveFlash>(window.sessionStorage, SAVE_FLASH_KEY, {
    entryId,
    message,
    createdAt: Date.now()
  })
}

export function consumeDictionarySaveFlash(): DictionarySaveFlash | null {
  const flash = readJson<DictionarySaveFlash>(window.sessionStorage, SAVE_FLASH_KEY)
  remove(window.sessionStorage, SAVE_FLASH_KEY)
  if (!flash || Date.now() - flash.createdAt > 30_000) return null
  return flash
}

export function readAddDraft(): AddDraft | null {
  return readJson<AddDraft>(window.localStorage, ADD_DRAFT_KEY)
}

export function writeAddDraft(form: EntryFormState): void {
  writeJson<AddDraft>(window.localStorage, ADD_DRAFT_KEY, { form, savedAt: Date.now() })
}

export function clearAddDraft(): void {
  remove(window.localStorage, ADD_DRAFT_KEY)
}
