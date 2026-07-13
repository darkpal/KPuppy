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

/** Stable label for matching озвучка across episodes of the same title. */
export function getAudioTrackName(audio: {
  lang?: string
  type?: { title?: string } | null
  author?: { title?: string } | null
}): string {
  const typeTitle = audio.type?.title || ''
  const authorTitle = audio.author?.title || ''
  const lang = (audio.lang || '').toUpperCase()
  const parts: string[] = []
  if (typeTitle && authorTitle) {
    parts.push(`${typeTitle}.`)
  } else if (typeTitle) {
    parts.push(typeTitle)
  }
  if (authorTitle) parts.push(authorTitle)
  if (typeTitle || authorTitle) {
    if (lang) parts.push(`(${lang})`)
  } else if (lang) {
    parts.push(lang)
  }
  return parts.join(' ').trim()
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
  type?: { title?: string } | null
  author?: { title?: string } | null
}): void {
  const pref: SavedAudioPreference = {
    id: audio.id,
    name: getAudioTrackName(audio)
  }
  writeStorage(`${AUDIO_PREF_PREFIX}${itemId}`, JSON.stringify(pref))
}

export function findAudioIndex(
  audios: Array<{ id: number; lang?: string; type?: { title?: string } | null; author?: { title?: string } | null }>,
  saved: SavedAudioPreference | null
): number {
  if (!saved || audios.length === 0) return 0
  const byId = audios.findIndex(a => a.id === saved.id)
  if (byId >= 0) return byId
  const byName = audios.findIndex(a => getAudioTrackName(a) === saved.name)
  return byName >= 0 ? byName : 0
}
