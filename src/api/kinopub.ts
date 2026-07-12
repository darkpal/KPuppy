import { getTokens, saveTokens, Tokens } from '../storage'
import { getCached, setCache, createCacheKey, invalidateCache, cachedFetch } from './cache'

const BASE_URL = 'https://api.service-kp.com'
const CLIENT_ID = 'xbmc'
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET || 'cgg3gtifu46urtfp2zp1nqtba0k2ezxh'
const APP_VERSION = __APP_VERSION__

let onAuthErrorCallback: (() => void) | null = null

export function setOnAuthError(callback: (() => void) | null): void {
  onAuthErrorCallback = callback
}

function handleAuthError(): void {
  if (onAuthErrorCallback) {
    onAuthErrorCallback()
  }
}

export interface DeviceCodeResponse {
  code: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface Poster {
  small: string
  medium: string
  big: string
}

export interface MovieItem {
  id: number
  title: string
  type: string
  year: number
  plot: string
  posters: Poster
  rating: number
  imdbRating: number
  kinopoiskRating: number
  ratingPercentage: number
  /** Max available height, e.g. 2160 / 1080 / 720 (Kinopub API). */
  quality: number
  views: number
}

export interface Person {
  id: number
  name: string
}

export interface Genre {
  id: number
  title: string
  type: string
}

export interface Country {
  id: number
  title: string
}

export interface VideoFile {
  quality: string
  url: {
    http?: string
    hls?: string
    hls2?: string
    hls4?: string
  }
}

export interface AudioType {
  id: number
  title: string
  short_title: string
}

export interface AudioAuthor {
  id: number
  title: string
  short_title: string
}

export interface Audio {
  id: number
  index: number
  codec: string
  channels: number
  lang: string
  type: AudioType
  author: AudioAuthor | null
}

export interface Subtitle {
  lang: string
  shift: number
  embed: boolean
  forced: boolean
  file: string
  url: string
}

export interface WatchingProgress {
  status?: number
  time?: number
}

export interface Video {
  id?: number | string
  number: number
  title: string
  files: VideoFile[]
  audios: Audio[]
  subtitles?: Subtitle[]
  duration?: number
  watched?: number
  watching?: WatchingProgress
}

export interface Episode {
  id: number
  number: number
  title: string
  thumbnail?: string
  duration?: number
  files: VideoFile[]
  audios: Audio[]
  subtitles?: Subtitle[]
  watched: number
  watching?: WatchingProgress
}

export interface Season {
  number: number
  episodes: Episode[]
}

export interface ItemDetails extends MovieItem {
  directors: Person[]
  actors: Person[]
  countries: Country[]
  genres: Genre[]
  videos?: Video[]
  seasons?: Season[]
  duration?: {
    average: number
    total: number
  }
  trailer?: {
    url: string
  }
}

export interface Pagination {
  current: number
  total: number
  totalItems: number
  perpage: number
}

export interface ItemsResponse {
  items: MovieItem[]
  pagination: Pagination
}

export interface ItemsParams {
  type?: 'movie' | 'serial' | 'documovie' | 'docuserial' | 'tvshow' | 'concert' | '3D'
  sort?:
    | 'created-'
    | 'created'
    | 'rating'
    | 'rating-'
    | 'views'
    | 'views-'
    | 'watchers'
    | 'watchers-'
    | 'year'
    | 'year-'
    | 'title'
    | 'title-'
  page?: number
  perpage?: number
  genre?: number
  country?: number
  year?: string
  quality?: '4k'
  /** e.g. ["created>=1710000000"] — same fields as sort */
  conditions?: string[]
}

/** Calendar month ago as unix seconds (matches ValeraGin dayjs().add(-1, 'month')). */
export function monthAgoUnix(now = Date.now()): number {
  const d = new Date(now)
  d.setMonth(d.getMonth() - 1)
  return Math.floor(d.getTime() / 1000)
}

function encodeQueryValue(value: string | number): string {
  return encodeURIComponent(String(value))
}

/** Build /v1/items query like ValeraGin (encode conditions[0] brackets). */
export function buildItemsQuery(params: ItemsParams): string {
  const parts: string[] = []
  if (params.type) parts.push(`type=${encodeQueryValue(params.type)}`)
  if (params.sort) parts.push(`sort=${encodeQueryValue(params.sort)}`)
  if (params.page !== undefined) parts.push(`page=${encodeQueryValue(params.page)}`)
  if (params.perpage) parts.push(`perpage=${encodeQueryValue(params.perpage)}`)
  if (params.genre) parts.push(`genre=${encodeQueryValue(params.genre)}`)
  if (params.country) parts.push(`country=${encodeQueryValue(params.country)}`)
  if (params.year) parts.push(`year=${encodeQueryValue(params.year)}`)
  if (params.quality) parts.push(`quality=${encodeQueryValue(params.quality)}`)
  if (params.conditions) {
    params.conditions.forEach((condition, index) => {
      // PHP array keys must be encoded the same way as ValeraGin normalizeArrayParams
      parts.push(`${encodeQueryValue(`conditions[${index}]`)}=${encodeQueryValue(condition)}`)
    })
  }
  return parts.join('&')
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function mapToMovieItem(item: Record<string, unknown>): MovieItem {
  return {
    id: item.id as number,
    title: (item.title || '') as string,
    type: (item.type || '') as string,
    year: (item.year || 0) as number,
    plot: (item.plot || '') as string,
    posters: (item.posters || { small: '', medium: '', big: '' }) as Poster,
    rating: Number(item.rating) || 0,
    imdbRating: Number(item.imdb_rating) || 0,
    kinopoiskRating: Number(item.kinopoisk_rating) || 0,
    ratingPercentage: Number(item.rating_percentage) || 0,
    quality: Number(item.quality) || 0,
    views: Number(item.views) || 0
  }
}

function mapToBookmarkFolder(folder: Record<string, unknown>): BookmarkFolder {
  return {
    id: folder.id as number,
    title: (folder.title || '') as string,
    count: (folder.count || 0) as number,
    created: (folder.created || 0) as number,
    updated: (folder.updated || 0) as number
  }
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const body = `grant_type=device_code&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`

  const response = await fetch(`${BASE_URL}/oauth2/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) {
    throw new ApiError(`Failed to request device code: ${response.status}`, response.status)
  }

  const data = await response.json()
  return {
    code: data.code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval
  }
}

export async function pollForToken(deviceCode: string): Promise<TokenResponse | null> {
  const body = `grant_type=device_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${deviceCode}`
  const response = await fetch(`${BASE_URL}/oauth2/device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  const data = await response.json()

  if (data.error === 'authorization_pending') {
    return null
  }

  if (!response.ok || data.error) {
    throw new ApiError(data.error || 'Failed to get token', response.status)
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = `grant_type=refresh_token&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${encodeURIComponent(refreshToken)}`
  const response = await fetch(`${BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!response.ok) {
    throw new ApiError('Failed to refresh token', response.status)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  }
}

let refreshPromise: Promise<Tokens> | null = null

async function ensureFreshTokens(): Promise<Tokens> {
  const tokens = getTokens()
  if (!tokens) {
    handleAuthError()
    throw new ApiError('Not authenticated', 401)
  }

  if (Date.now() < tokens.expiresAt) {
    return tokens
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(tokens.refresh)
      .then(newTokens => {
        const updatedTokens: Tokens = {
          access: newTokens.accessToken,
          refresh: newTokens.refreshToken,
          expiresAt: Date.now() + newTokens.expiresIn * 1000
        }
        saveTokens(updatedTokens)
        return updatedTokens
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  try {
    return await refreshPromise
  } catch {
    handleAuthError()
    throw new ApiError('Token refresh failed', 401)
  }
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const freshTokens = await ensureFreshTokens()
  const accessToken = freshTokens.access

  const headers: Record<string, string> = {}
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value
      })
    } else if (typeof options.headers === 'object') {
      Object.assign(headers, options.headers)
    }
  }
  headers['Authorization'] = `Bearer ${accessToken}`

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    handleAuthError()
    throw new ApiError('Not authenticated', 401)
  }

  return response
}

export interface WatchingItem {
  id: number
  title: string
  type: string
  subtype: string
  posters: Poster
  year: number,
  total: number
  watched: number
  new: number
}

export interface WatchingResponse {
  items: WatchingItem[]
}

type ItemCardMeta = Pick<MovieItem, 'imdbRating' | 'kinopoiskRating' | 'ratingPercentage' | 'quality' | 'year'>

export async function fetchItemCardMeta(id: number): Promise<ItemCardMeta | null> {
  try {
    const response = await authFetch(`${BASE_URL}/v1/items/${id}`)
    if (!response.ok) return null
    const data = await response.json()
    const item = (data.item || data) as Record<string, unknown>
    return {
      imdbRating: Number(item.imdb_rating) || 0,
      kinopoiskRating: Number(item.kinopoisk_rating) || 0,
      ratingPercentage: Number(item.rating_percentage) || 0,
      quality: Number(item.quality) || 0,
      year: Number(item.year) || 0
    }
  } catch {
    return null
  }
}

export async function enrichMovieItemsMeta(items: MovieItem[]): Promise<MovieItem[]> {
  const missing = items.filter(item =>
    item.quality <= 0 || item.year <= 0 || (item.imdbRating <= 0 && item.kinopoiskRating <= 0 && item.ratingPercentage <= 0)
  )
  if (missing.length === 0) return items

  const metas = await Promise.all(missing.map(item => fetchItemCardMeta(item.id)))
  const byId = new Map<number, ItemCardMeta>()
  missing.forEach((item, index) => {
    const meta = metas[index]
    if (meta) byId.set(item.id, meta)
  })
  if (byId.size === 0) return items

  return items.map(item => {
    const meta = byId.get(item.id)
    if (!meta) return item
    return {
      ...item,
      imdbRating: item.imdbRating > 0 ? item.imdbRating : meta.imdbRating,
      kinopoiskRating: item.kinopoiskRating > 0 ? item.kinopoiskRating : meta.kinopoiskRating,
      ratingPercentage: item.ratingPercentage > 0 ? item.ratingPercentage : meta.ratingPercentage,
      quality: item.quality > 0 ? item.quality : meta.quality,
      year: item.year > 0 ? item.year : meta.year
    }
  })
}

export async function getWatching(): Promise<MovieItem[]> {
  const cacheKey = 'watching_v2'
  const cached = getCached<MovieItem[]>(cacheKey)
  if (cached) return cached

  const [moviesRes, serialsRes] = await Promise.all([
    authFetch(`${BASE_URL}/v1/watching/movies?subscribed=1`),
    authFetch(`${BASE_URL}/v1/watching/serials?subscribed=1`)
  ])

  const moviesData = moviesRes.ok ? await moviesRes.json() : { items: [] }
  const serialsData = serialsRes.ok ? await serialsRes.json() : { items: [] }

  const allItems = [...(moviesData.items || []), ...(serialsData.items || [])]

  const result = await enrichMovieItemsMeta(allItems.map(mapToMovieItem))
  setCache(cacheKey, result)
  return result
}

export async function getWatchingSerials(): Promise<WatchingItem[]> {
  const cacheKey = 'watching_serials'
  const cached = getCached<WatchingItem[]>(cacheKey)
  if (cached) return cached

  const response = await authFetch(`${BASE_URL}/v1/watching/serials?subscribed=1`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch watching serials', response.status)
  }

  const data = await response.json()
  const items = data.items || []

  const result: WatchingItem[] = items.map((item: Record<string, unknown>) => ({
    id: item.id as number,
    title: item.title as string,
    type: item.type as string,
    subtype: (item.subtype || '') as string,
    year: (item.year || 0) as number,
    posters: item.posters as Poster,
    total: (item.total || 0) as number,
    watched: (item.watched || 0) as number,
    new: (item.new || 0) as number
  }))

  setCache(cacheKey, result)
  return result
}

export async function getItems(params: ItemsParams = {}): Promise<ItemsResponse> {
  const cacheKey = createCacheKey(
    'items',
    params.type,
    params.sort,
    params.page,
    params.perpage,
    params.genre,
    params.country,
    params.year,
    ...(params.conditions || [])
  )
  const cached = getCached<ItemsResponse>(cacheKey)
  if (cached) return cached

  const query = buildItemsQuery(params)
  const response = await authFetch(`${BASE_URL}/v1/items?${query}`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch items', response.status)
  }

  const data = await response.json()

  const result: ItemsResponse = {
    items: data.items.map(mapToMovieItem),
    pagination: {
      current: data.pagination.current,
      total: data.pagination.total,
      totalItems: data.pagination.total_items,
      perpage: data.pagination.perpage
    }
  }

  setCache(cacheKey, result)
  return result
}

async function getItemsShortcut(
  path: 'popular' | 'fresh' | 'hot',
  type?: ItemsParams['type'],
  page: number = 0,
  perpage: number = 20
): Promise<ItemsResponse> {
  const cacheKey = createCacheKey('items', path, type, page, perpage)
  const cached = getCached<ItemsResponse>(cacheKey)
  if (cached) return cached

  const searchParams = new URLSearchParams()
  if (type) searchParams.set('type', type)
  searchParams.set('page', page.toString())
  searchParams.set('perpage', perpage.toString())

  const response = await authFetch(`${BASE_URL}/v1/items/${path}?${searchParams}`)

  if (!response.ok) {
    throw new ApiError(`Failed to fetch ${path} items`, response.status)
  }

  const data = await response.json()
  const result: ItemsResponse = {
    items: (data.items || []).map(mapToMovieItem),
    pagination: {
      current: data.pagination?.current ?? 0,
      total: data.pagination?.total ?? 0,
      totalItems: data.pagination?.total_items ?? 0,
      perpage: data.pagination?.perpage ?? perpage
    }
  }

  setCache(cacheKey, result)
  return result
}

/** Shortcut used by Kinopub web for "Популярные ..." */
export function getPopularItems(type?: ItemsParams['type'], perpage = 20): Promise<ItemsResponse> {
  return getItemsShortcut('popular', type, 0, perpage)
}

/** Shortcut used by Kinopub web for "Новые/свежие ..." */
export function getFreshItems(type?: ItemsParams['type'], perpage = 20): Promise<ItemsResponse> {
  return getItemsShortcut('fresh', type, 0, perpage)
}

export function getHotItems(type?: ItemsParams['type'], perpage = 20): Promise<ItemsResponse> {
  return getItemsShortcut('hot', type, 0, perpage)
}

export interface SearchParams {
  q: string
  field?: 'title' | 'director' | 'actor'
  type?: string
  page?: number
  perpage?: number
}

export async function searchItems(params: SearchParams): Promise<ItemsResponse> {
  const cacheKey = createCacheKey('search', params.q, params.field, params.type, params.page, params.perpage)
  const cached = getCached<ItemsResponse>(cacheKey)
  if (cached) return cached

  const searchParams = new URLSearchParams()
  searchParams.set('q', params.q)
  if (params.field) searchParams.set('field', params.field)
  if (params.type) searchParams.set('type', params.type)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.perpage) searchParams.set('perpage', params.perpage.toString())

  const response = await authFetch(`${BASE_URL}/v1/items/search?${searchParams}`)

  if (!response.ok) {
    throw new ApiError('Failed to search items', response.status)
  }

  const data = await response.json()

  const result: ItemsResponse = {
    items: (data.items || []).map(mapToMovieItem),
    pagination: data.pagination ? {
      current: data.pagination.current,
      total: data.pagination.total,
      totalItems: data.pagination.total_items,
      perpage: data.pagination.perpage
    } : {
      current: 1,
      total: 1,
      totalItems: data.items?.length || 0,
      perpage: 20
    }
  }

  setCache(cacheKey, result)
  return result
}

export interface SelectOption {
  id: number
  label: string
  selected: number
}

export interface DeviceSettings {
  support4k: number
  supportHevc: number
  supportHdr: number
  supportSsl: number
  mixedPlaylist: number
  serverLocation: SelectOption[]
  streamingType: SelectOption[]
}

export interface DeviceInfo {
  id: number
  settings: DeviceSettings
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const response = await authFetch(`${BASE_URL}/v1/device/info`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch device info', response.status)
  }

  const data = await response.json()
  const device = data.device

  return {
    id: device.id,
    settings: {
      support4k: device.settings?.support4k?.value ?? 0,
      supportHevc: device.settings?.supportHevc?.value ?? 0,
      supportHdr: device.settings?.supportHdr?.value ?? 0,
      supportSsl: device.settings?.supportSsl?.value ?? 0,
      mixedPlaylist: device.settings?.mixedPlaylist?.value ?? 0,
      serverLocation: device.settings?.serverLocation?.value || [],
      streamingType: device.settings?.streamingType?.value || []
    }
  }
}

export interface UpdateSettingsParams {
  support4k?: number
  supportHevc?: number
  supportHdr?: number
  supportSsl?: number
  mixedPlaylist?: number
  serverLocation?: number
  streamingType?: number
}

export async function updateDeviceSettings(deviceId: number, settings: UpdateSettingsParams): Promise<void> {
  const response = await authFetch(`${BASE_URL}/v1/device/${deviceId}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })

  if (!response.ok) {
    throw new ApiError('Failed to update settings', response.status)
  }

  await response.json()
}

function getWebOSVersion(): string {
  try {
    if (typeof window !== 'undefined' && (window as any).PalmSystem?.deviceInfo) {
      const info = JSON.parse((window as any).PalmSystem.deviceInfo)
      return info.platformVersion || info.sdkVersion || 'unknown'
    }
  } catch {
    return 'unknown'
  }
  return 'unknown'
}

export async function registerDevice(): Promise<void> {
  const webosVersion = getWebOSVersion()
  const response = await authFetch(`${BASE_URL}/v1/device/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'LG webOS TV',
      hardware: `webOS ${webosVersion}`,
      software: `KPuppy ${APP_VERSION}`
    })
  })

  if (!response.ok && import.meta.env.DEV) {
    console.warn('Failed to register device:', response.status)
  }
}

export interface UserSubscription {
  active: boolean
  endTime: number
  days: number
}

export interface User {
  username: string
  avatar: string
  subscription: UserSubscription
}

export async function getUser(): Promise<User> {

  const response = await authFetch(`${BASE_URL}/v1/user`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch user', response.status)
  }

  const data = await response.json()
  const user = data.user

  const result: User = {
    username: user.username || '',
    avatar: user.avatar || '',
    subscription: {
      active: user.subscription?.active ?? false,
      endTime: user.subscription?.end_time ?? 0,
      days: user.subscription?.days ?? 0
    }
  }

  return result
}


function normalizeVideoFile(raw: Record<string, unknown>): VideoFile {
  const urls = (raw.urls || raw.url || {}) as Record<string, string | undefined>
  return {
    quality: String(raw.quality || ''),
    url: {
      http: urls.http,
      hls: urls.hls,
      hls2: urls.hls2,
      hls4: urls.hls4
    }
  }
}

function normalizeSubtitles(raw: unknown): Subtitle[] {
  if (!Array.isArray(raw)) return []
  return raw.map((entry, index) => {
    const s = (entry || {}) as Record<string, unknown>
    const lang = s.lang ?? s.language ?? s.title
    return {
      lang: String(lang || `sub${index + 1}`),
      shift: Number(s.shift) || 0,
      embed: Boolean(s.embed),
      forced: Boolean(s.forced),
      file: String(s.file || ''),
      url: String(s.url || '')
    }
  }).filter(sub => Boolean(sub.url || sub.lang))
}

export interface MediaLinks {
  files: VideoFile[]
  subtitles: Subtitle[]
}

/** Full files + subtitles for a media/video id (Kinopub media-links). */
export async function getMediaLinks(mediaId: number | string): Promise<MediaLinks> {
  const response = await authFetch(`${BASE_URL}/v1/items/media-links?mid=${mediaId}`)
  if (!response.ok) {
    throw new ApiError('Failed to fetch media links', response.status)
  }
  const data = await response.json()
  return {
    files: Array.isArray(data.files) ? data.files.map((f: Record<string, unknown>) => normalizeVideoFile(f)) : [],
    subtitles: normalizeSubtitles(data.subtitles)
  }
}

export async function getItem(id: number): Promise<ItemDetails> {
  const cacheKey = createCacheKey('item', id)
  const cached = getCached<ItemDetails>(cacheKey)
  if (cached) return cached

  const response = await authFetch(`${BASE_URL}/v1/items/${id}`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch item', response.status)
  }

  const data = await response.json()
  const item = data.item

  const parsePersonsFromString = (str: unknown): Person[] => {
    if (typeof str !== 'string' || !str) return []
    return str.split(',').map((name, i) => ({
      id: i,
      name: name.trim()
    })).filter(p => p.name)
  }

  const parsePersonsFromArray = (arr: unknown): Person[] => {
    if (!Array.isArray(arr)) return []
    return arr.map((p: Record<string, unknown>) => ({
      id: p.id as number,
      name: (p.name || p.title || '') as string
    })).filter(p => p.name)
  }

  const parseGenres = (arr: unknown): Genre[] => {
    if (!Array.isArray(arr)) return []
    return arr.map((g: Record<string, unknown>) => ({
      id: g.id as number,
      title: (g.title || g.name || '') as string,
      type: (g.type || '') as string
    })).filter(g => g.title)
  }

  const parseCountries = (arr: unknown): Country[] => {
    if (!Array.isArray(arr)) return []
    return arr.map((c: Record<string, unknown>) => ({
      id: c.id as number,
      title: (c.title || c.name || '') as string
    })).filter(c => c.title)
  }

  const directors = typeof item.director === 'string'
    ? parsePersonsFromString(item.director)
    : parsePersonsFromArray(item.directors)

  const actors = typeof item.cast === 'string'
    ? parsePersonsFromString(item.cast)
    : parsePersonsFromArray(item.actors)

  const result: ItemDetails = {
    id: item.id,
    title: item.title,
    type: item.type,
    year: item.year,
    plot: item.plot,
    posters: item.posters,
    rating: item.rating,
    imdbRating: item.imdb_rating,
    kinopoiskRating: item.kinopoisk_rating,
    ratingPercentage: item.rating_percentage || 0,
    quality: Number(item.quality) || 0,
    views: item.views,
    directors,
    actors,
    countries: parseCountries(item.countries),
    genres: parseGenres(item.genres),
    videos: item.videos,
    seasons: item.seasons,
    duration: item.duration,
    trailer: item.trailer
  }

  setCache(cacheKey, result)
  return result
}

export interface MarkTimeParams {
  id: number
  time: number
  video?: number
  season?: number
}

export async function markTime(params: MarkTimeParams): Promise<void> {
  const searchParams = new URLSearchParams()
  searchParams.set('id', params.id.toString())
  searchParams.set('time', params.time.toString())
  if (params.video !== undefined) searchParams.set('video', params.video.toString())
  if (params.season !== undefined) searchParams.set('season', params.season.toString())

  await authFetch(`${BASE_URL}/v1/watching/marktime?${searchParams}`)
  invalidateCache('watching'); invalidateCache('watching_v2')
  invalidateCache('history')
  invalidateCache(createCacheKey('item', params.id))
}

export async function getWatchingProgress(
  id: number,
  video?: number,
  season?: number
): Promise<WatchingProgress | null> {
  const searchParams = new URLSearchParams()
  searchParams.set('id', id.toString())
  if (video !== undefined) searchParams.set('video', video.toString())
  if (season !== undefined) searchParams.set('season', season.toString())

  const response = await authFetch(`${BASE_URL}/v1/watching?${searchParams}`)
  if (!response.ok) return null

  const data = await response.json()
  const item = data?.item ?? data
  if (!item) return null

  if (item.watching && typeof item.watching === 'object') {
    return {
      status: item.watching.status as number | undefined,
      time: item.watching.time as number | undefined
    }
  }

  if (typeof item.time === 'number') {
    return {
      status: typeof item.status === 'number' ? item.status : undefined,
      time: item.time
    }
  }

  return null
}

export interface ToggleWatchedParams {
  id: number
  video?: number
  season?: number
}

export async function toggleWatched(params: ToggleWatchedParams): Promise<void> {
  const searchParams = new URLSearchParams()
  searchParams.set('id', params.id.toString())
  if (params.video !== undefined) searchParams.set('video', params.video.toString())
  if (params.season !== undefined) searchParams.set('season', params.season.toString())

  await authFetch(`${BASE_URL}/v1/watching/toggle?${searchParams}`)
  invalidateCache('watching'); invalidateCache('watching_v2')
  invalidateCache('history')
  invalidateCache(createCacheKey('item', params.id))
}

export interface BookmarkFolder {
  id: number
  title: string
  count: number
  created: number
  updated: number
}

export async function getBookmarkFolders(): Promise<BookmarkFolder[]> {
  const cacheKey = 'bookmarks'
  const cached = getCached<BookmarkFolder[]>(cacheKey)
  if (cached) return cached

  const response = await authFetch(`${BASE_URL}/v1/bookmarks`)

  if (!response.ok) {
    if (import.meta.env.DEV) console.error('Bookmarks API error:', response.status)
    throw new ApiError('Failed to fetch bookmarks', response.status)
  }

  const data = await response.json()
  if (import.meta.env.DEV) console.log('Bookmarks API response:', data)

  const items = data.items || []
  if (!Array.isArray(items)) {
    if (import.meta.env.DEV) console.error('Bookmark items not an array:', items)
    return []
  }

  const result: BookmarkFolder[] = items.map(mapToBookmarkFolder)

  setCache(cacheKey, result)
  return result
}

export async function getBookmarkItems(folderId: number): Promise<MovieItem[]> {
  const cacheKey = createCacheKey('bookmark', folderId)
  const cached = getCached<MovieItem[]>(cacheKey)
  if (cached) return cached

  const response = await authFetch(`${BASE_URL}/v1/bookmarks/${folderId}`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch bookmark items', response.status)
  }

  const data = await response.json()

  const result: MovieItem[] = (data.items || []).map(mapToMovieItem)

  setCache(cacheKey, result)
  return result
}

export async function createBookmarkFolder(title: string): Promise<BookmarkFolder> {
  const response = await authFetch(`${BASE_URL}/v1/bookmarks/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })

  if (!response.ok) {
    throw new ApiError('Failed to create bookmark folder', response.status)
  }

  const data = await response.json()
  invalidateCache('bookmarks')

  return {
    id: data.folder?.id ?? data.id,
    title: data.folder?.title ?? title,
    count: 0,
    created: Date.now() / 1000,
    updated: Date.now() / 1000
  }
}

export async function getItemFolders(itemId: number): Promise<BookmarkFolder[]> {
  const response = await authFetch(`${BASE_URL}/v1/bookmarks/get-item-folders?item=${itemId}`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch item folders', response.status)
  }

  const data = await response.json()
  const folders = data.folders || []
  if (!Array.isArray(folders)) {
    return []
  }

  return folders.map(mapToBookmarkFolder)
}

export async function addToBookmark(itemId: number, folderId: number): Promise<void> {
  const response = await authFetch(`${BASE_URL}/v1/bookmarks/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: itemId, folder: folderId })
  })

  if (!response.ok) {
    throw new ApiError('Failed to add to bookmark', response.status)
  }

  invalidateCache('bookmarks')
  invalidateCache(createCacheKey('bookmark', folderId))
}

export async function removeFromBookmark(itemId: number, folderId: number): Promise<void> {
  const response = await authFetch(`${BASE_URL}/v1/bookmarks/remove-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: itemId, folder: folderId })
  })

  if (!response.ok) {
    throw new ApiError('Failed to remove from bookmark', response.status)
  }

  invalidateCache('bookmarks')
  invalidateCache(createCacheKey('bookmark', folderId))
}

export async function deleteBookmarkFolder(folderId: number): Promise<void> {
  const response = await authFetch(`${BASE_URL}/v1/bookmarks/remove-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: folderId })
  })

  if (!response.ok) {
    throw new ApiError('Failed to delete bookmark folder', response.status)
  }

  invalidateCache('bookmarks')
  invalidateCache(createCacheKey('bookmark', folderId))
}

export async function getSimilarItems(id: number): Promise<MovieItem[]> {
  const cacheKey = createCacheKey('similar', id)
  const cached = getCached<MovieItem[]>(cacheKey)
  if (cached) return cached

  const response = await authFetch(`${BASE_URL}/v1/items/similar?id=${id}`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch similar items', response.status)
  }

  const data = await response.json()

  const result: MovieItem[] = (data.items || []).map(mapToMovieItem)

  setCache(cacheKey, result)
  return result
}

export interface Collection {
  id: number
  title: string
  count: number
  posters: Poster
}

export async function getCollections(): Promise<Collection[]> {
  const cacheKey = 'collections'
  const cached = getCached<Collection[]>(cacheKey)
  if (cached) return cached

  const response = await authFetch(`${BASE_URL}/v1/collections`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch collections', response.status)
  }

  const data = await response.json()

  const result: Collection[] = (data.items || []).map((item: Record<string, unknown>) => ({
    id: item.id as number,
    title: item.title as string,
    count: (item.count || item.total || item.items_count || 0) as number,
    posters: item.posters as Poster
  }))

  setCache(cacheKey, result)
  return result
}

export async function getCollectionItems(id: number): Promise<MovieItem[]> {
  const cacheKey = createCacheKey('collection', id)
  const cached = getCached<MovieItem[]>(cacheKey)
  if (cached) return cached

  const response = await authFetch(`${BASE_URL}/v1/collections/view?id=${id}`)

  if (!response.ok) {
    throw new ApiError('Failed to fetch collection items', response.status)
  }

  const data = await response.json()

  const result: MovieItem[] = (data.items || []).map(mapToMovieItem)

  setCache(cacheKey, result)
  return result
}

export interface HistoryItem extends MovieItem {
  watchedAt: number
  episodeInfo?: {
    season: number
    episode: number
    title: string
    thumbnail?: string
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  const cacheKey = 'history'
  const cached = getCached<HistoryItem[]>(cacheKey)
  if (cached) return cached

  const response = await authFetch(`${BASE_URL}/v1/history`)

  if (!response.ok) {
    if (import.meta.env.DEV) console.error('History API error:', response.status)
    throw new ApiError('Failed to fetch history', response.status)
  }

  const data = await response.json()
  if (import.meta.env.DEV) console.log('History API response:', data)

  const items = data.items || data.history || []
  if (!Array.isArray(items)) {
    if (import.meta.env.DEV) console.error('History items not an array:', items)
    return []
  }

  const result: HistoryItem[] = items.map((entry: Record<string, unknown>) => {
    const item = (entry.item || entry) as Record<string, unknown>
    const media = entry.media as Record<string, unknown> | undefined

    const historyItem: HistoryItem = {
      ...mapToMovieItem(item),
      watchedAt: (entry.last_seen || entry.time || entry.watched_at || item.watched_at || 0) as number
    }

    if (media && media.snumber !== undefined) {
      historyItem.episodeInfo = {
        season: media.snumber as number,
        episode: media.number as number,
        title: (media.title || '') as string,
        thumbnail: media.thumbnail as string | undefined
      }
    }

    return historyItem
  })

  setCache(cacheKey, result)
  return result
}

export async function clearHistoryForItem(itemId: number): Promise<void> {
  const response = await authFetch(`${BASE_URL}/v1/history/clear-for-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: itemId })
  })

  if (!response.ok) {
    throw new ApiError('Failed to clear history for item', response.status)
  }

  invalidateCache('history')
}

export async function toggleWatchlist(itemId: number): Promise<void> {
  const response = await authFetch(`${BASE_URL}/v1/watching/togglewatchlist?id=${itemId}`, {
    method: 'POST'
  })

  if (!response.ok) {
    throw new ApiError('Failed to toggle watchlist', response.status)
  }

  invalidateCache('watching'); invalidateCache('watching_v2')
  invalidateCache('watching_serials')
}

export async function isItemInWatchlist(itemId: number): Promise<boolean> {
  try {
    const [moviesRes, serialsRes] = await Promise.all([
      authFetch(`${BASE_URL}/v1/watching/movies?subscribed=1`),
      authFetch(`${BASE_URL}/v1/watching/serials?subscribed=1`)
    ])
    const moviesData = moviesRes.ok ? await moviesRes.json() : { items: [] }
    const serialsData = serialsRes.ok ? await serialsRes.json() : { items: [] }
    const ids = [...(moviesData.items || []), ...(serialsData.items || [])].map(
      (item: { id?: number }) => Number(item.id)
    )
    return ids.includes(itemId)
  } catch (err) {
    if (import.meta.env.DEV) console.error('isItemInWatchlist failed:', err)
    return false
  }
}

export async function getGenres(): Promise<Genre[]> {
  return cachedFetch('genres', async () => {
    const response = await authFetch(`${BASE_URL}/v1/genres`)

    if (!response.ok) {
      throw new ApiError('Failed to fetch genres', response.status)
    }

    const data = await response.json()

    return (data.items || []).map((item: Record<string, unknown>) => ({
      id: item.id as number,
      title: (item.title || item.name || '') as string,
      type: (item.type || '') as string
    }))
  })
}

export async function getCountries(): Promise<Country[]> {
  return cachedFetch('countries', async () => {
    const response = await authFetch(`${BASE_URL}/v1/countries`)

    if (!response.ok) {
      throw new ApiError('Failed to fetch countries', response.status)
    }

    const data = await response.json()

    return (data.items || []).map((item: Record<string, unknown>) => ({
      id: item.id as number,
      title: (item.title || item.name || '') as string
    }))
  })
}

export interface ContentType {
  id: string
  title: string
}

export async function getContentTypes(): Promise<ContentType[]> {
  return cachedFetch('types', async () => {
    const response = await authFetch(`${BASE_URL}/v1/types`)

    if (!response.ok) {
      throw new ApiError('Failed to fetch content types', response.status)
    }

    const data = await response.json()

    return (data.items || []).map((item: Record<string, unknown>) => ({
      id: (item.id || '') as string,
      title: (item.title || item.name || '') as string
    }))
  })
}

export interface TVChannel {
  id: number
  title: string
  url?: string
  logo?: string
}

export async function getTVChannels(): Promise<TVChannel[]> {
  return cachedFetch('tv', async () => {
    const response = await authFetch(`${BASE_URL}/v1/tv`)

    if (!response.ok) {
      throw new ApiError('Failed to fetch TV channels', response.status)
    }

    const data = await response.json()

    return (data.items || data.channels || []).map((item: Record<string, unknown>) => {
      const logos = item.logos as Record<string, string> | undefined
      return {
        id: item.id as number,
        title: (item.title || item.name || '') as string,
        url: (item.stream || item.url) as string | undefined,
        logo: (logos?.s || logos?.m || item.logo) as string | undefined
      }
    })
  })
}
