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
}

const DEFAULT_SETTINGS: LocalSettings = {
  defaultQuality: 'auto',
  playerType: 'native',
  showContinueWatching: true
}

export function getLocalSettings(): LocalSettings {
  const data = localStorage.getItem(SETTINGS_KEY)
  if (!data) return DEFAULT_SETTINGS

  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveLocalSettings(settings: Partial<LocalSettings>): void {
  const current = getLocalSettings()
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }))
}

export function saveTokens(tokens: Tokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function getTokens(): Tokens | null {
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return null

  try {
    return JSON.parse(data) as Tokens
  } catch {
    return null
  }
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY)
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
  localStorage.setItem(RETURN_TO_KEY, JSON.stringify(state))
}

export function getReturnTo(): ReturnToState | null {
  const data = localStorage.getItem(RETURN_TO_KEY)
  if (!data) return null

  try {
    return JSON.parse(data) as ReturnToState
  } catch {
    return null
  }
}

export function clearReturnTo(): void {
  localStorage.removeItem(RETURN_TO_KEY)
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
  const data = localStorage.getItem(CONTENT_TYPES_KEY)
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
  localStorage.setItem(CONTENT_TYPES_KEY, JSON.stringify(cached))
}
