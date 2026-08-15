const STORAGE_KEY = 'kpuppy_tokens'
const SETTINGS_KEY = 'kpuppy_settings'
const RETURN_TO_KEY = 'kpuppy_return_to'
const CONTENT_TYPES_KEY = 'kpuppy_content_types'

export interface Tokens {
  access: string
  refresh: string
  expiresAt: number
}

export type VideoQuality = '2160p' | '1080p' | '720p' | '480p' | 'auto'
export type PlayerType = 'native' | 'builtin'

export interface LocalSettings {
  defaultQuality: VideoQuality
  playerType: PlayerType
  showContinueWatching: boolean
  /** Keep side menu labels visible even when focus is in content. */
  pinSideMenu: boolean
}

const DEFAULT_SETTINGS: LocalSettings = {
  defaultQuality: 'auto',
  playerType: 'builtin',
  showContinueWatching: true,
  pinSideMenu: false
}

/** webOS may throw when storage is disabled — never let that crash boot. */
export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('localStorage read failed:', err)
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('localStorage write failed:', err)
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('localStorage remove failed:', err)
  }
}

export function getLocalSettings(): LocalSettings {
  const data = readStorage(SETTINGS_KEY)
  if (!data) return DEFAULT_SETTINGS

  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveLocalSettings(settings: Partial<LocalSettings>): void {
  const current = getLocalSettings()
  writeStorage(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kpuppy-settings-changed'))
  }
}

export function saveTokens(tokens: Tokens): void {
  writeStorage(STORAGE_KEY, JSON.stringify(tokens))
}

export function getTokens(): Tokens | null {
  const data = readStorage(STORAGE_KEY)
  if (!data) return null

  try {
    return JSON.parse(data) as Tokens
  } catch {
    return null
  }
}

export function clearTokens(): void {
  removeStorage(STORAGE_KEY)
}

export function isAuthenticated(): boolean {
  const tokens = getTokens()
  if (!tokens) return false

  return Date.now() < tokens.expiresAt
}

export interface ReturnToState {
  itemId: number | null
  seriesId: number | null
  selectedMenuId: string
  screenFocus?: Record<string, { row: number; col: number }>
}

export function saveReturnTo(state: ReturnToState): void {
  writeStorage(RETURN_TO_KEY, JSON.stringify(state))
}

export function getReturnTo(): ReturnToState | null {
  const data = readStorage(RETURN_TO_KEY)
  if (!data) return null

  try {
    return JSON.parse(data) as ReturnToState
  } catch {
    return null
  }
}

export function clearReturnTo(): void {
  removeStorage(RETURN_TO_KEY)
}

export interface CachedContentType {
  id: string
  title: string
}

export interface CachedContentTypes {
  types: CachedContentType[]
  fetchedAt: number
}

const CONTENT_TYPES_TTL = 24 * 60 * 60 * 1000

export function getContentTypesCache(): CachedContentType[] | null {
  const data = readStorage(CONTENT_TYPES_KEY)
  if (!data) return null

  try {
    const cached = JSON.parse(data) as CachedContentTypes
    if (Date.now() - cached.fetchedAt > CONTENT_TYPES_TTL) {
      return null
    }
    return cached.types
  } catch {
    return null
  }
}

export function saveContentTypesCache(types: CachedContentType[]): void {
  const cached: CachedContentTypes = {
    types,
    fetchedAt: Date.now()
  }
  writeStorage(CONTENT_TYPES_KEY, JSON.stringify(cached))
}


const AUDIO_PREF_PREFIX = 'kpuppy_audio_'

export interface SavedAudioPreference {
  id: number
  name: string
}

/** Normalize codec for labels. AAC is the default — omit it (Kinopub web style). */
export function formatAudioCodec(codec?: string | null): string {
  const value = (codec || '').trim().toUpperCase()
  if (!value || value === 'AAC') return ''
  return value
}

/** Display / preference label: «Дубляж (RUS)» or «Дубляж (RUS) AC3». */
export function getAudioTrackName(audio: {
  lang?: string
  codec?: string | null
  type?: { title?: string } | null
  author?: { title?: string } | null
}): string {
  const typeTitle = (audio.type?.title || '').trim()
  const authorTitle = (audio.author?.title || '').trim()
  const lang = (audio.lang || '').toUpperCase()
  const codec = formatAudioCodec(audio.codec)
  let base = ''
  if (typeTitle && authorTitle) {
    base = `${typeTitle}, ${authorTitle}${lang ? ` (${lang})` : ''}`
  } else if (typeTitle) {
    base = `${typeTitle}${lang ? ` (${lang})` : ''}`
  } else if (authorTitle) {
    base = `${authorTitle}${lang ? ` (${lang})` : ''}`
  } else {
    base = lang
  }
  if (codec && base) return `${base} ${codec}`
  return base || codec
}

/** Preference match without codec (legacy labels / cross-episode). */
export function getAudioTrackBaseName(audio: {
  lang?: string
  type?: { title?: string } | null
  author?: { title?: string } | null
}): string {
  return getAudioTrackName({ ...audio, codec: null })
}

function stripAudioCodecSuffix(name: string): string {
  return name.replace(/\s+(AAC|AC3|E-?AC3|EAC3|DTS(?:-?HD)?|TRUEHD|FLAC|MP3|OPUS)\s*$/i, '').trim()
}

export function getSavedAudioPreference(itemId: number): SavedAudioPreference | null {
  const data = readStorage(`${AUDIO_PREF_PREFIX}${itemId}`)
  if (!data) return null
  try {
    const parsed = JSON.parse(data) as SavedAudioPreference
    if (!parsed || typeof parsed.name !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function saveAudioPreference(itemId: number, audio: {
  id: number
  lang?: string
  codec?: string | null
  type?: { title?: string } | null
  author?: { title?: string } | null
}): void {
  const pref: SavedAudioPreference = {
    id: audio.id,
    name: getAudioTrackName(audio)
  }
  writeStorage(`${AUDIO_PREF_PREFIX}${itemId}`, JSON.stringify(pref))
}

const PLAYBACK_PROGRESS_KEY = 'kpuppy_playback_progress'
const PLAYBACK_PROGRESS_LIMIT = 40

type LocalPlaybackMap = Record<string, { time: number; updatedAt: number }>

export function playbackProgressKey(itemId: number, video?: number, season?: number): string {
  return `${itemId}:${season ?? ''}:${video ?? 1}`
}

function readPlaybackProgressMap(): LocalPlaybackMap {
  const data = readStorage(PLAYBACK_PROGRESS_KEY)
  if (!data) return {}
  try {
    const parsed = JSON.parse(data) as LocalPlaybackMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writePlaybackProgressMap(map: LocalPlaybackMap): void {
  const entries = Object.entries(map)
  if (entries.length <= PLAYBACK_PROGRESS_LIMIT) {
    writeStorage(PLAYBACK_PROGRESS_KEY, JSON.stringify(map))
    return
  }
  entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt)
  const trimmed: LocalPlaybackMap = {}
  for (const [key, value] of entries.slice(0, PLAYBACK_PROGRESS_LIMIT)) {
    trimmed[key] = value
  }
  writeStorage(PLAYBACK_PROGRESS_KEY, JSON.stringify(trimmed))
}

/** Sync snapshot so a power-off still has the last known position. */
export function saveLocalPlaybackProgress(
  itemId: number,
  time: number,
  video?: number,
  season?: number
): void {
  const seconds = Math.floor(time)
  if (itemId <= 0 || seconds <= 0) return
  const map = readPlaybackProgressMap()
  map[playbackProgressKey(itemId, video, season)] = { time: seconds, updatedAt: Date.now() }
  writePlaybackProgressMap(map)
}

export function getLocalPlaybackProgress(
  itemId: number,
  video?: number,
  season?: number
): number {
  const entry = readPlaybackProgressMap()[playbackProgressKey(itemId, video, season)]
  return entry?.time ?? 0
}

export function findAudioIndex(
  audios: Array<{ id: number; lang?: string; codec?: string | null; type?: { title?: string } | null; author?: { title?: string } | null }>,
  saved: SavedAudioPreference | null
): number {
  if (!saved || audios.length === 0) return 0
  const byId = audios.findIndex(a => a.id === saved.id)
  if (byId >= 0) return byId
  const savedBase = stripAudioCodecSuffix(saved.name)
  const byName = audios.findIndex(a => {
    const name = getAudioTrackName(a)
    const base = getAudioTrackBaseName(a)
    return name === saved.name
      || base === saved.name
      || base === savedBase
      || stripAudioCodecSuffix(name) === savedBase
  })
  return byName >= 0 ? byName : 0
}
