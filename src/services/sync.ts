import { db, dbEvents, notifyDatabaseChanged } from '../db/database'
import { normalizeText } from '../domain/normalize'
import type { DictionaryEntry, Tag } from '../domain/types'

// Compatible with the existing Quick Links Worker. Each dictionary has its own
// randomly generated vault, secret and HKDF domain; the Worker only sees ciphertext.
const ENDPOINT = 'https://quicklinks-sync.silovar-uk.workers.dev'
const META_KEY = 'watashi-jiten-sync-v1'
const BASE_KEY = 'base'
const ENVELOPE_VERSION = 'quick-links-cipher-v1'
const FORMAT = 'watashi-jiten-sync-v1'
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const USER_FIELDS_EXCLUDED = new Set([
  'id', 'normalizedHeadword', 'normalizedReading', 'createdAt', 'updatedAt',
  'revision', 'lastViewedAt', 'viewCount', 'randomShownAt', 'randomShownCount'
])

export type SyncPhase = 'off' | 'pending' | 'syncing' | 'ok' | 'error' | 'conflict'
export interface SyncMeta {
  enabled: boolean
  vaultId: string
  secret: string
  phase: SyncPhase
  lastSyncedAt: string
  lastError: string
}
export interface SyncConflict {
  key: string
  label: string
  field: string
  local: unknown
  remote: unknown
}
export interface PairInfo { v: 1; endpoint: string; vaultId: string; secret: string }
interface Payload {
  schemaVersion: typeof FORMAT
  entries: DictionaryEntry[]
  tags: Tag[]
  tombstones: Record<string, string>
}
type Choices = Record<string, 'local' | 'remote'>

const updates = new EventTarget()
const emptyPayload = (): Payload => ({ schemaVersion: FORMAT, entries: [], tags: [], tombstones: {} })
const json = (x: unknown): string => JSON.stringify(x)
const equal = (a: unknown, b: unknown): boolean => json(a) === json(b)
const clone = <T,>(x: T): T => structuredClone(x)
const later = (a?: string, b?: string): string => (a || '') > (b || '') ? a || '' : b || ''
const earlier = (a?: string, b?: string): string => !a ? b || '' : !b ? a : a < b ? a : b
const mapById = <T extends { id: string }>(list: T[]): Map<string, T> => new Map(list.map((x) => [x.id, x]))
const bytesToBase64 = (bytes: Uint8Array): string => {
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4))
  return Uint8Array.from(raw, (x) => x.charCodeAt(0))
}
function randomId(n: number): string { return bytesToBase64(crypto.getRandomValues(new Uint8Array(n))) }

function loadMeta(): SyncMeta {
  const defaults: SyncMeta = { enabled: false, vaultId: '', secret: '', phase: 'off', lastSyncedAt: '', lastError: '' }
  try {
    const stored = JSON.parse(localStorage.getItem(META_KEY) || 'null') as Partial<SyncMeta> | null
    if (!stored || !stored.enabled) return defaults
    // In-flight requests do not survive iOS/Safari suspension.
    return { ...defaults, ...stored, phase: stored.phase === 'syncing' ? 'pending' : stored.phase || 'pending' }
  } catch { return defaults }
}
let meta = loadMeta()
let active: Promise<void> | null = null
let autoTimer: ReturnType<typeof setTimeout> | undefined
let incomingPair: PairInfo | null = null

export function getSyncMeta(): SyncMeta { return { ...meta, secret: '' } }
export function subscribeSync(callback: () => void): () => void {
  updates.addEventListener('change', callback)
  return () => updates.removeEventListener('change', callback)
}
function setMeta(changes: Partial<SyncMeta>) {
  meta = { ...meta, ...changes }
  localStorage.setItem(META_KEY, json(meta))
  updates.dispatchEvent(new Event('change'))
}
function validatePair(value: unknown): value is PairInfo {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<PairInfo>
  return v.v === 1 && v.endpoint === ENDPOINT &&
    typeof v.vaultId === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(v.vaultId) &&
    typeof v.secret === 'string' && /^[A-Za-z0-9_-]{40,100}$/.test(v.secret)
}
export function capturePairLink(): boolean {
  if (!location.hash.startsWith('#pair=')) return false
  const token = new URLSearchParams(location.hash.substring(1)).get('pair') || ''
  // Do not leave the bearer secret in browser history after receiving it.
  history.replaceState(null, '', location.pathname + location.search)
  try {
    const pair = JSON.parse(decoder.decode(base64ToBytes(token))) as unknown
    if (!validatePair(pair)) throw new Error('連携リンクの形式が正しくありません。')
    incomingPair = pair
    return true
  } catch {
    setMeta({ lastError: '連携リンクを読み取れませんでした。', phase: 'error' })
    return false
  }
}
export function pendingPair(): boolean { return incomingPair !== null }
export function discardPair(): void { incomingPair = null }
export function getPairUrl(): string {
  if (!meta.enabled) throw new Error('同期の設定が必要です。')
  const pair: PairInfo = { v: 1, endpoint: ENDPOINT, vaultId: meta.vaultId, secret: meta.secret }
  const url = new URL(location.href)
  url.search = ''
  url.hash = 'pair=' + bytesToBase64(encoder.encode(json(pair)))
  return url.toString()
}
export function enableNewSync(): void {
  setMeta({ enabled: true, vaultId: randomId(18), secret: randomId(32), phase: 'pending', lastSyncedAt: '', lastError: '' })
}
export async function joinPairedSync(): Promise<void> {
  if (!incomingPair) throw new Error('連携リンクがありません。')
  const pair = incomingPair
  await db.syncState.delete(BASE_KEY)
  setMeta({ enabled: true, vaultId: pair.vaultId, secret: pair.secret, phase: 'pending', lastError: '', lastSyncedAt: '' })
  await syncNow()
  incomingPair = null
}
export async function disconnectSync(): Promise<void> {
  if (active) throw new Error('同期が終わってから解除してください。')
  await db.syncState.delete(BASE_KEY)
  meta = { enabled: false, vaultId: '', secret: '', phase: 'off', lastSyncedAt: '', lastError: '' }
  localStorage.removeItem(META_KEY)
  updates.dispatchEvent(new Event('change'))
}

async function derive(info: string, kind: 'bits' | 'key'): Promise<CryptoKey | Uint8Array<ArrayBuffer>> {
  const master = await crypto.subtle.importKey('raw', base64ToBytes(meta.secret), 'HKDF', false, ['deriveKey', 'deriveBits'])
  const hkdf = { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('mydictionary:' + meta.vaultId), info: encoder.encode(info) }
  if (kind === 'bits') return new Uint8Array(await crypto.subtle.deriveBits(hkdf, master, 256))
  return crypto.subtle.deriveKey(hkdf, master, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function authHeaders(extra: Record<string, string> = {}): Promise<HeadersInit> {
  return { Authorization: 'Bearer ' + bytesToBase64(await derive('auth-v1', 'bits') as Uint8Array), ...extra }
}
async function encrypt(data: Payload): Promise<unknown> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode('mydictionary:' + meta.vaultId + ':v1') },
    await derive('encrypt-v1', 'key') as CryptoKey, encoder.encode(json(data))
  )
  return { schemaVersion: ENVELOPE_VERSION, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(encrypted)) }
}
async function decrypt(envelope: { iv: string; ciphertext: string }): Promise<Payload> {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(envelope.iv), additionalData: encoder.encode('mydictionary:' + meta.vaultId + ':v1') },
    await derive('encrypt-v1', 'key') as CryptoKey, base64ToBytes(envelope.ciphertext)
  )
  const payload = JSON.parse(decoder.decode(data)) as Payload
  if (payload?.schemaVersion !== FORMAT || !Array.isArray(payload.entries) ||
      !Array.isArray(payload.tags) || !payload.tombstones || typeof payload.tombstones !== 'object') {
    throw new Error('同期データの形式が一致しません。')
  }
  if (payload.entries.some((entry) => !entry?.id || typeof entry.headword !== 'string') ||
      payload.tags.some((tag) => !tag?.id || typeof tag.normalizedName !== 'string')) {
    throw new Error('同期データが壊れています。')
  }
  return payload
}
async function fetchSafe(url: string, init: RequestInit): Promise<Response> {
  if (navigator.onLine === false) throw new Error('オフラインです。変更はこの端末に保存されています。')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try { return await fetch(url, { ...init, cache: 'no-store', signal: controller.signal }) }
  catch { throw new Error('同期先に接続できませんでした。端末内のデータは残っています。') }
  finally { clearTimeout(timer) }
}
async function readRemote(): Promise<{ data: Payload | null; etag: string }> {
  const response = await fetchSafe(ENDPOINT + '/v1/vault/' + meta.vaultId, {
    method: 'GET', headers: await authHeaders({ Accept: 'application/json' })
  })
  if (response.status === 404) return { data: null, etag: '' }
  if (response.status === 401) throw new Error('同期キーが一致しません。')
  if (!response.ok) throw new Error('共有データを読み込めませんでした (' + response.status + ')')
  try { return { data: await decrypt(await response.json()), etag: response.headers.get('ETag') || '' } }
  catch (error) { throw new Error(error instanceof Error ? error.message : '共有データを復号できませんでした。') }
}
async function writeRemote(data: Payload, etag: string, isNew: boolean): Promise<{ changed: boolean; etag: string }> {
  const headers = await authHeaders({
    'Content-Type': 'application/json',
    ...(isNew ? { 'If-None-Match': '*' } : { 'If-Match': etag })
  })
  const response = await fetchSafe(ENDPOINT + '/v1/vault/' + meta.vaultId, {
    method: 'PUT', headers, body: json(await encrypt(data))
  })
  if ([409, 412, 428].includes(response.status)) return { changed: false, etag: '' }
  if (response.status === 413) throw new Error('同期データが5MiBの上限を超えました。JSONバックアップを保存してください。')
  if (response.status === 401) throw new Error('同期キーが一致しません。')
  if (!response.ok) throw new Error('共有データを保存できませんでした (' + response.status + ')')
  return { changed: true, etag: response.headers.get('ETag') || '' }
}
async function readLocal(): Promise<Payload> {
  const [entries, tags] = await Promise.all([db.entries.toArray(), db.tags.toArray()])
  return { schemaVersion: FORMAT, entries: entries.sort((a, b) => a.id.localeCompare(b.id)),
    tags: tags.sort((a, b) => a.id.localeCompare(b.id)), tombstones: {} }
}
async function readBase(): Promise<Payload | null> {
  const row = await db.syncState.get(BASE_KEY)
  return row?.value && typeof row.value === 'object' ? row.value as Payload : null
}
async function writeBase(payload: Payload) { await db.syncState.put({ key: BASE_KEY, value: payload }) }

// Independent devices may have created the same tag under different UUIDs.
// Canonicalize by normalized name before merging to preserve Dexie's unique index.
function alignTags(base: Payload | null, local: Payload, remote: Payload): [Payload | null, Payload, Payload] {
  const canonical = new Map<string, string>()
  for (const payload of [base, remote, local]) {
    for (const tag of payload?.tags || []) if (!canonical.has(tag.normalizedName)) canonical.set(tag.normalizedName, tag.id)
  }
  function aligned(p: Payload | null): Payload | null {
    if (!p) return null
    const remap = new Map(p.tags.map((tag) => [tag.id, canonical.get(tag.normalizedName) || tag.id]))
    const tags = new Map<string, Tag>()
    p.tags.forEach((tag) => {
      const id = remap.get(tag.id)!
      if (!tags.has(id)) tags.set(id, { ...tag, id })
    })
    return { ...p, tags: [...tags.values()].sort((a, b) => a.id.localeCompare(b.id)),
      entries: p.entries.map((entry) => ({ ...entry,
        tagIds: [...new Set(entry.tagIds.map((id) => remap.get(id) || id))].sort()
      })).sort((a, b) => a.id.localeCompare(b.id)) }
  }
  return [aligned(base), aligned(local)!, aligned(remote)!]
}
function choose(base: unknown, local: unknown, remote: unknown, key: string, label: string, field: string,
  conflicts: SyncConflict[], choices: Choices): unknown {
  if (equal(local, remote)) return local
  if (equal(local, base)) return remote
  if (equal(remote, base)) return local
  if (choices[key]) return choices[key] === 'remote' ? remote : local
  conflicts.push({ key, label, field, local, remote })
  return local
}
function mergeTag(base: Tag | undefined, local: Tag | undefined, remote: Tag | undefined,
  conflicts: SyncConflict[], choices: Choices): Tag | undefined {
  if (!local) return remote
  if (!remote) return local
  const name = choose(base?.name, local.name, remote.name, 'tag:' + local.id + ':name',
    local.name, 'タグ名', conflicts, choices) as string
  return { id: local.id, name, normalizedName: normalizeText(name),
    createdAt: earlier(local.createdAt, remote.createdAt), updatedAt: later(local.updatedAt, remote.updatedAt) }
}
function mergeEntry(base: DictionaryEntry | undefined, local: DictionaryEntry | undefined, remote: DictionaryEntry | undefined,
  conflicts: SyncConflict[], choices: Choices): DictionaryEntry | undefined {
  if (!local) return remote
  if (!remote) return local
  const label = local.headword || remote.headword
  const l = local as unknown as Record<string, unknown>
  const r = remote as unknown as Record<string, unknown>
  const b = base as unknown as Record<string, unknown> | undefined
  const result = { ...local } as unknown as Record<string, unknown>
  const keys = new Set([...Object.keys(l), ...Object.keys(r)])
  keys.forEach((key) => {
    if (USER_FIELDS_EXCLUDED.has(key)) return
    result[key] = clone(choose(b?.[key], l[key], r[key], 'entry:' + local.id + ':' + key,
      label, key, conflicts, choices))
  })
  result.normalizedHeadword = normalizeText(String(result.headword || ''))
  result.normalizedReading = normalizeText(String(result.reading || ''))
  result.createdAt = earlier(local.createdAt, remote.createdAt)
  result.updatedAt = later(local.updatedAt, remote.updatedAt)
  result.revision = Math.max(local.revision, remote.revision)
  result.lastViewedAt = later(local.lastViewedAt, remote.lastViewedAt)
  result.randomShownAt = later(local.randomShownAt, remote.randomShownAt)
  result.viewCount = Math.max(local.viewCount, remote.viewCount)
  result.randomShownCount = Math.max(local.randomShownCount, remote.randomShownCount)
  return result as unknown as DictionaryEntry
}
function merge(baseOriginal: Payload | null, localOriginal: Payload, remoteOriginal: Payload,
  choices: Choices): { merged: Payload; conflicts: SyncConflict[] } {
  const [base, local, remote] = alignTags(baseOriginal, localOriginal, remoteOriginal)
  const B = mapById(base?.entries || [])
  const L = mapById(local.entries)
  const R = mapById(remote.entries)
  const conflicts: SyncConflict[] = []
  const tombstones = { ...(base?.tombstones || {}), ...remote.tombstones }
  // A missing entry that existed in the last synchronized snapshot represents
  // a permanent deletion; no remote-only item is treated as locally deleted.
  B.forEach((_, id) => { if (!L.has(id)) tombstones[id] = tombstones[id] || new Date().toISOString() })
  const entries: DictionaryEntry[] = []
  new Set([...B.keys(), ...L.keys(), ...R.keys()]).forEach((id) => {
    const b = B.get(id), l = L.get(id), r = R.get(id)
    if (tombstones[id]) {
      const survivor = l || r
      const edited = survivor && b && survivor.updatedAt !== b.updatedAt && !survivor.deletedAt
      if (edited) {
        const key = 'delete:' + id
        const local = l ? 'この端末で編集' : 'この端末で完全削除'
        const remote = r ? '共有側で編集' : '共有側で完全削除'
        if (!choices[key]) conflicts.push({ key, label: survivor.headword, field: '削除と編集', local, remote })
        else if ((choices[key] === 'local' && l) || (choices[key] === 'remote' && r)) {
          delete tombstones[id]
          entries.push((choices[key] === 'local' ? l : r)!)
        }
      }
      return
    }
    const merged = mergeEntry(b, l, r, conflicts, choices)
    if (merged) entries.push(merged)
  })
  const BT = mapById(base?.tags || [])
  const LT = mapById(local.tags)
  const RT = mapById(remote.tags)
  const tags: Tag[] = []
  new Set([...BT.keys(), ...LT.keys(), ...RT.keys()]).forEach((id) => {
    const value = mergeTag(BT.get(id), LT.get(id), RT.get(id), conflicts, choices)
    if (value) tags.push(value)
  })
  return { merged: { schemaVersion: FORMAT, entries: entries.sort((a, b) => a.id.localeCompare(b.id)),
    tags: tags.sort((a, b) => a.id.localeCompare(b.id)), tombstones }, conflicts }
}
export class SyncConflictError extends Error {
  constructor(public conflicts: SyncConflict[]) { super('同じ言葉が両端末で編集されています。') }
}
export async function syncNow(choices: Choices = {}): Promise<void> {
  if (!meta.enabled) throw new Error('先に端末間同期を設定してください。')
  if (active) return active
  const task = (async () => {
    setMeta({ phase: 'syncing', lastError: '' })
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const [local, base, remoteResponse] = await Promise.all([readLocal(), readBase(), readRemote()])
        const remote = remoteResponse.data || emptyPayload()
        const { merged, conflicts } = merge(base, local, remote, choices)
        if (conflicts.length) throw new SyncConflictError(conflicts)
        let etag = remoteResponse.etag
        if (!remoteResponse.data || !equal(remote, merged)) {
          const response = await writeRemote(merged, etag, !remoteResponse.data)
          if (!response.changed) continue // Conditional PUT lost a race: refetch/remerge.
          etag = response.etag
        }
        // Do not overwrite edits performed while the request was in flight.
        if (!equal(await readLocal(), local)) {
          await writeBase(merged)
          setMeta({ phase: 'pending', lastSyncedAt: new Date().toISOString() })
          scheduleSync(400)
          return
        }
        // A clean sync must not rewrite IndexedDB or emit a change event:
        // otherwise the change listener can create a never-ending sync loop.
        if (equal(local, merged)) {
          await writeBase(merged)
          setMeta({ phase: 'ok', lastSyncedAt: new Date().toISOString(), lastError: '' })
          return
        }
        await db.transaction('rw', db.entries, db.tags, db.syncState, async () => {
          const [currentEntries, currentTags] = await Promise.all([db.entries.toArray(), db.tags.toArray()])
          if (!equal(currentEntries.sort((a, b) => a.id.localeCompare(b.id)), local.entries) ||
              !equal(currentTags.sort((a, b) => a.id.localeCompare(b.id)), local.tags)) {
            throw new Error('同期中に編集がありました。もう一度同期してください。')
          }
          await db.entries.clear()
          await db.tags.clear()
          await db.tags.bulkPut(merged.tags)
          await db.entries.bulkPut(merged.entries)
          await db.syncState.put({ key: BASE_KEY, value: merged })
        })
        notifyDatabaseChanged()
        setMeta({ phase: 'ok', lastSyncedAt: new Date().toISOString(), lastError: '' })
        return
      }
      throw new Error('別の端末でも更新がありました。もう一度同期してください。')
    } catch (error) {
      const conflict = error instanceof SyncConflictError
      setMeta({ phase: conflict ? 'conflict' : 'error', lastError: error instanceof Error ? error.message : '同期に失敗しました。' })
      throw error
    }
  })()
  active = task
  try { await task } finally { active = null }
}
export function scheduleSync(delay = 1000) {
  if (!meta.enabled || meta.phase === 'conflict' || navigator.onLine === false) return
  if (meta.phase !== 'syncing') setMeta({ phase: 'pending' })
  if (autoTimer) clearTimeout(autoTimer)
  autoTimer = setTimeout(() => { void syncNow().catch(() => undefined) }, delay)
}
export function startAutoSync(): () => void {
  const onChange = () => scheduleSync(1200)
  const onVisible = () => { if (document.visibilityState === 'visible') scheduleSync(200) }
  const onFocus = () => scheduleSync(200)
  dbEvents.addEventListener('changed', onChange)
  window.addEventListener('online', onFocus)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisible)
  const polling = setInterval(() => { if (document.visibilityState === 'visible') scheduleSync(200) }, 90_000)
  if (meta.enabled) scheduleSync(400)
  return () => {
    dbEvents.removeEventListener('changed', onChange)
    window.removeEventListener('online', onFocus)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(polling)
    if (autoTimer) clearTimeout(autoTimer)
  }
}
