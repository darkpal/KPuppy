import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  requestDeviceCode,
  pollForToken,
  refreshAccessToken,
  getItems,
  getItem,
  searchItems,
  getDeviceInfo,
  updateDeviceSettings,
  getUser,
  getWatching,
  markTime,
  toggleWatched,
  getBookmarkFolders,
  getBookmarkItems,
  createBookmarkFolder,
  addToBookmark,
  removeFromBookmark,
  deleteBookmarkFolder,
  getSimilarItems,
  getCollections,
  getCollectionItems,
  getHistory,
  clearHistoryForItem,
  toggleWatchlist,
  getGenres,
  getCountries,
  getContentTypes,
  getTVChannels,
  setOnAuthError,
  ApiError
} from '../../src/api/kinopub'
import { invalidateCache } from '../../src/api/cache'

const mockFetch = vi.fn()
global.fetch = mockFetch

function createMockXHR(responseData: object, status = 200) {
  const mockXHR = {
    open: vi.fn(),
    send: vi.fn(),
    setRequestHeader: vi.fn(),
    status,
    responseText: JSON.stringify(responseData),
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null
  }
  mockXHR.send.mockImplementation(function() {
    setTimeout(() => mockXHR.onload?.(), 0)
  })
  return mockXHR
}

describe('kinopub API', () => {
  let originalXHR: typeof XMLHttpRequest

  beforeEach(() => {
    mockFetch.mockReset()
    localStorage.clear()
    invalidateCache()
    originalXHR = global.XMLHttpRequest
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.XMLHttpRequest = originalXHR
  })

  describe('requestDeviceCode', () => {
    it('sends correct POST body', async () => {
      const mockXHR = createMockXHR({
        code: 'device-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://kino.pub/device',
        expires_in: 600,
        interval: 5
      })
      global.XMLHttpRequest = vi.fn(() => mockXHR) as unknown as typeof XMLHttpRequest

      await requestDeviceCode()

      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'https://api.service-kp.com/oauth2/device', true)
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/x-www-form-urlencoded')

      const body = new URLSearchParams(mockXHR.send.mock.calls[0][0])
      expect(body.get('grant_type')).toBe('device_code')
      expect(body.get('client_id')).toBe('xbmc')
      expect(body.get('client_secret')).toBe('cgg3gtifu46urtfp2zp1nqtba0k2ezxh')
    })

    it('parses response correctly', async () => {
      const mockXHR = createMockXHR({
        code: 'device-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://kino.pub/device',
        expires_in: 600,
        interval: 5
      })
      global.XMLHttpRequest = vi.fn(() => mockXHR) as unknown as typeof XMLHttpRequest

      const result = await requestDeviceCode()

      expect(result).toEqual({
        code: 'device-code',
        userCode: 'ABCD-1234',
        verificationUri: 'https://kino.pub/device',
        expiresIn: 600,
        interval: 5
      })
    })

    it('throws ApiError on failure', async () => {
      const mockXHR = createMockXHR({}, 500)
      global.XMLHttpRequest = vi.fn(() => mockXHR) as unknown as typeof XMLHttpRequest

      await expect(requestDeviceCode()).rejects.toThrow(ApiError)
    })
  })

  describe('pollForToken', () => {
    it('returns null on authorization_pending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'authorization_pending'
        })
      })

      const result = await pollForToken('device-code')

      expect(result).toBeNull()
    })

    it('returns tokens on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600
        })
      })

      const result = await pollForToken('device-code')

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600
      })
    })

    it('sends device_token grant type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'authorization_pending' })
      })

      await pollForToken('test-device-code')

      const call = mockFetch.mock.calls[0]
      const body = new URLSearchParams(call[1].body)
      expect(body.get('grant_type')).toBe('device_token')
      expect(body.get('code')).toBe('test-device-code')
    })
  })

  describe('refreshAccessToken', () => {
    it('sends refresh_token grant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600
        })
      })

      await refreshAccessToken('old-refresh-token')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.service-kp.com/oauth2/token',
        expect.any(Object)
      )

      const call = mockFetch.mock.calls[0]
      const body = new URLSearchParams(call[1].body)
      expect(body.get('grant_type')).toBe('refresh_token')
      expect(body.get('refresh_token')).toBe('old-refresh-token')
    })

    it('returns new tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 7200
        })
      })

      const result = await refreshAccessToken('old-refresh')

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 7200
      })
    })
  })

  describe('getItems', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pagination: { current: 1, total: 0, total_items: 0, perpage: 20 }
        })
      })

      await getItems()

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('handles pagination params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pagination: { current: 2, total: 10, total_items: 200, perpage: 20 }
        })
      })

      await getItems({ type: 'movie', sort: 'created-', page: 2, perpage: 20 })

      const call = mockFetch.mock.calls[0]
      const url = new URL(call[0])
      expect(url.searchParams.get('type')).toBe('movie')
      expect(url.searchParams.get('sort')).toBe('created-')
      expect(url.searchParams.get('page')).toBe('2')
      expect(url.searchParams.get('perpage')).toBe('20')
    })

    it('transforms response to camelCase', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Test Movie',
              type: 'movie',
              year: 2023,
              plot: 'A test movie',
              posters: { small: 'http://s.jpg', medium: 'http://m.jpg', big: 'http://b.jpg' },
              rating: 8.5,
              imdb_rating: 7.8,
              kinopoisk_rating: 8.2,
              views: 1000
            }
          ],
          pagination: { current: 1, total: 1, total_items: 1, perpage: 20 }
        })
      })

      const result = await getItems()

      expect(result.items[0].imdbRating).toBe(7.8)
      expect(result.items[0].kinopoiskRating).toBe(8.2)
      expect(result.pagination.totalItems).toBe(1)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getItems()).rejects.toThrow(ApiError)
    })
  })

  describe('getItem', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches item by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          item: {
            id: 123,
            title: 'Test Movie',
            type: 'movie',
            year: 2023,
            plot: 'A test movie',
            posters: { small: 'http://s.jpg', medium: 'http://m.jpg', big: 'http://b.jpg' },
            rating: 8.5,
            imdb_rating: 7.8,
            kinopoisk_rating: 8.2,
            views: 1000,
            directors: [{ id: 1, name: 'Director Name' }],
            actors: [{ id: 2, name: 'Actor Name' }],
            countries: [{ id: 1, title: 'USA' }],
            genres: [{ id: 1, title: 'Action' }],
            duration: { average: 120, total: 120 }
          }
        })
      })

      const result = await getItem(123)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/items/123')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('transforms response to camelCase', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          item: {
            id: 123,
            title: 'Test Movie',
            type: 'movie',
            year: 2023,
            plot: 'A test movie',
            posters: { small: 'http://s.jpg', medium: 'http://m.jpg', big: 'http://b.jpg' },
            rating: 8.5,
            imdb_rating: 7.8,
            kinopoisk_rating: 8.2,
            views: 1000,
            directors: [],
            actors: [],
            countries: [],
            genres: []
          }
        })
      })

      const result = await getItem(123)

      expect(result.id).toBe(123)
      expect(result.imdbRating).toBe(7.8)
      expect(result.kinopoiskRating).toBe(8.2)
    })

    it('includes directors and actors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          item: {
            id: 123,
            title: 'Test Movie',
            type: 'movie',
            year: 2023,
            plot: 'A test movie',
            posters: {},
            rating: 8.5,
            imdb_rating: 7.8,
            kinopoisk_rating: 8.2,
            views: 1000,
            directors: [{ id: 1, name: 'Steven Spielberg' }],
            actors: [{ id: 2, name: 'Tom Hanks' }, { id: 3, name: 'Meg Ryan' }],
            countries: [{ id: 1, title: 'USA' }],
            genres: [{ id: 1, title: 'Drama' }, { id: 2, title: 'Comedy' }]
          }
        })
      })

      const result = await getItem(123)

      expect(result.directors).toHaveLength(1)
      expect(result.directors[0].name).toBe('Steven Spielberg')
      expect(result.actors).toHaveLength(2)
      expect(result.genres).toHaveLength(2)
    })

    it('includes seasons for series', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          item: {
            id: 456,
            title: 'Test Series',
            type: 'serial',
            year: 2023,
            plot: 'A test series',
            posters: {},
            rating: 9.0,
            imdb_rating: 8.5,
            kinopoisk_rating: 9.0,
            views: 5000,
            directors: [],
            actors: [],
            countries: [],
            genres: [],
            seasons: [
              { number: 1, episodes: [{ id: 1, number: 1, title: 'Pilot' }] },
              { number: 2, episodes: [{ id: 2, number: 1, title: 'Season 2 Premiere' }] }
            ]
          }
        })
      })

      const result = await getItem(456)

      expect(result.seasons).toHaveLength(2)
      expect(result.seasons![0].number).toBe(1)
      expect(result.seasons![0].episodes).toHaveLength(1)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(getItem(999)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getItem(123)).rejects.toThrow(ApiError)
    })
  })

  describe('searchItems', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pagination: { current: 1, total: 0, total_items: 0, perpage: 20 }
        })
      })

      await searchItems({ q: 'test query' })

      const call = mockFetch.mock.calls[0]
      const url = new URL(call[0])
      expect(url.pathname).toBe('/v1/items/search')
      expect(url.searchParams.get('q')).toBe('test query')
    })

    it('includes optional field parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pagination: { current: 1, total: 0, total_items: 0, perpage: 20 }
        })
      })

      await searchItems({ q: 'spielberg', field: 'director' })

      const call = mockFetch.mock.calls[0]
      const url = new URL(call[0])
      expect(url.searchParams.get('field')).toBe('director')
    })

    it('includes pagination params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pagination: { current: 2, total: 5, total_items: 100, perpage: 48 }
        })
      })

      await searchItems({ q: 'movie', page: 2, perpage: 48 })

      const call = mockFetch.mock.calls[0]
      const url = new URL(call[0])
      expect(url.searchParams.get('page')).toBe('2')
      expect(url.searchParams.get('perpage')).toBe('48')
    })

    it('transforms response to camelCase', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Test Movie',
              type: 'movie',
              year: 2023,
              plot: 'A test movie',
              posters: { small: 'http://s.jpg', medium: 'http://m.jpg', big: 'http://b.jpg' },
              rating: 8.5,
              imdb_rating: 7.8,
              kinopoisk_rating: 8.2,
              views: 1000
            }
          ],
          pagination: { current: 1, total: 1, total_items: 1, perpage: 20 }
        })
      })

      const result = await searchItems({ q: 'test' })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].imdbRating).toBe(7.8)
      expect(result.items[0].kinopoiskRating).toBe(8.2)
    })

    it('handles empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: []
        })
      })

      const result = await searchItems({ q: 'nonexistent' })

      expect(result.items).toHaveLength(0)
      expect(result.pagination.totalItems).toBe(0)
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pagination: { current: 1, total: 0, total_items: 0, perpage: 20 }
        })
      })

      await searchItems({ q: 'test' })

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(searchItems({ q: 'test' })).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(searchItems({ q: 'test' })).rejects.toThrow(ApiError)
    })
  })

  describe('getDeviceInfo', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches device info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device: {
            id: 12345,
            settings: {
              support4k: { value: 1 },
              supportHevc: { value: 1 },
              supportHdr: { value: 0 },
              supportSsl: { value: 1 },
              mixedPlaylist: { value: 0 },
              serverLocation: {
                value: [
                  { id: 1, name: 'Server 1', selected: 1 },
                  { id: 2, name: 'Server 2', selected: 0 }
                ]
              }
            }
          }
        })
      })

      const result = await getDeviceInfo()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/device/info')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses device settings correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device: {
            id: 12345,
            settings: {
              support4k: { value: 1 },
              supportHevc: { value: 1 },
              supportHdr: { value: 0 },
              supportSsl: { value: 1 },
              mixedPlaylist: { value: 0 },
              serverLocation: {
                value: [
                  { id: 1, name: 'Server 1', selected: 1 },
                  { id: 2, name: 'Server 2', selected: 0 }
                ]
              }
            }
          }
        })
      })

      const result = await getDeviceInfo()

      expect(result.id).toBe(12345)
      expect(result.settings.support4k).toBe(1)
      expect(result.settings.supportHevc).toBe(1)
      expect(result.settings.supportHdr).toBe(0)
      expect(result.settings.supportSsl).toBe(1)
      expect(result.settings.mixedPlaylist).toBe(0)
      expect(result.settings.serverLocation).toHaveLength(2)
      expect(result.settings.serverLocation[0].name).toBe('Server 1')
      expect(result.settings.serverLocation[0].selected).toBe(1)
    })

    it('handles missing settings gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device: {
            id: 12345,
            settings: {}
          }
        })
      })

      const result = await getDeviceInfo()

      expect(result.id).toBe(12345)
      expect(result.settings.support4k).toBe(0)
      expect(result.settings.serverLocation).toEqual([])
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getDeviceInfo()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getDeviceInfo()).rejects.toThrow(ApiError)
    })
  })

  describe('updateDeviceSettings', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends POST request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await updateDeviceSettings(12345, { support4k: 1 })

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/device/12345/settings')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
      expect(call[1].headers['Content-Type']).toBe('application/json')
    })

    it('sends settings in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await updateDeviceSettings(12345, {
        support4k: 1,
        supportHevc: 0,
        serverLocation: 2
      })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.support4k).toBe(1)
      expect(body.supportHevc).toBe(0)
      expect(body.serverLocation).toBe(2)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      await expect(updateDeviceSettings(12345, { support4k: 1 })).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(updateDeviceSettings(12345, { support4k: 1 })).rejects.toThrow(ApiError)
    })
  })

  describe('getUser', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches user info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            username: 'testuser',
            avatar: 'https://example.com/avatar.jpg',
            subscription: {
              active: true,
              end_time: 1735689600,
              days: 30
            }
          }
        })
      })

      await getUser()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/user')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses user data correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            username: 'testuser',
            avatar: 'https://example.com/avatar.jpg',
            subscription: {
              active: true,
              end_time: 1735689600,
              days: 30
            }
          }
        })
      })

      const result = await getUser()

      expect(result.username).toBe('testuser')
      expect(result.avatar).toBe('https://example.com/avatar.jpg')
      expect(result.subscription.active).toBe(true)
      expect(result.subscription.endTime).toBe(1735689600)
      expect(result.subscription.days).toBe(30)
    })

    it('handles missing data gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {}
        })
      })

      const result = await getUser()

      expect(result.username).toBe('')
      expect(result.avatar).toBe('')
      expect(result.subscription.active).toBe(false)
      expect(result.subscription.endTime).toBe(0)
      expect(result.subscription.days).toBe(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      })

      await expect(getUser()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getUser()).rejects.toThrow(ApiError)
    })
  })

  describe('markTime', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends marktime request with required params', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await markTime({ id: 123, time: 300 })

      const call = mockFetch.mock.calls[0]
      const url = new URL(call[0])
      expect(url.pathname).toBe('/v1/watching/marktime')
      expect(url.searchParams.get('id')).toBe('123')
      expect(url.searchParams.get('time')).toBe('300')
    })

    it('includes optional video and season params', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await markTime({ id: 123, time: 300, video: 1, season: 2 })

      const call = mockFetch.mock.calls[0]
      const url = new URL(call[0])
      expect(url.searchParams.get('video')).toBe('1')
      expect(url.searchParams.get('season')).toBe('2')
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await markTime({ id: 123, time: 300 })

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })
  })

  describe('toggleWatched', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends toggle request with id', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await toggleWatched({ id: 123 })

      const call = mockFetch.mock.calls[0]
      const url = new URL(call[0])
      expect(url.pathname).toBe('/v1/watching/toggle')
      expect(url.searchParams.get('id')).toBe('123')
    })

    it('includes optional video and season params', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await toggleWatched({ id: 123, video: 5, season: 1 })

      const call = mockFetch.mock.calls[0]
      const url = new URL(call[0])
      expect(url.searchParams.get('video')).toBe('5')
      expect(url.searchParams.get('season')).toBe('1')
    })
  })

  describe('getWatching', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches both movies and serials', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [{ id: 1, title: 'Movie 1', type: 'movie', year: 2023, posters: {} }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [{ id: 2, title: 'Series 1', type: 'serial', year: 2023, posters: {} }]
          })
        })

      const result = await getWatching()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
    })

    it('handles empty results', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ items: [] })
        })

      const result = await getWatching()

      expect(result).toHaveLength(0)
    })

    it('throws ApiError on 401', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [] }) })

      await expect(getWatching()).rejects.toThrow(ApiError)
    })
  })

  describe('setOnAuthError', () => {
    beforeEach(() => {
      setOnAuthError(null)
    })

    it('calls auth error callback when not authenticated', async () => {
      localStorage.clear()
      const callback = vi.fn()
      setOnAuthError(callback)

      await expect(getItems()).rejects.toThrow(ApiError)

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('calls auth error callback on 401 response', async () => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))

      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

      const callback = vi.fn()
      setOnAuthError(callback)

      await expect(getItems()).rejects.toThrow(ApiError)

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('does not call callback on other errors', async () => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

      const callback = vi.fn()
      setOnAuthError(callback)

      await expect(getItems()).rejects.toThrow(ApiError)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('getBookmarkFolders', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches bookmark folders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Watch Later', count: 5, created: 1700000000, updated: 1700001000 },
            { id: 2, title: 'Favorites', count: 10, created: 1700000000, updated: 1700002000 }
          ]
        })
      })

      const result = await getBookmarkFolders()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/bookmarks')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses folders correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Watch Later', count: 5, created: 1700000000, updated: 1700001000 },
            { id: 2, title: 'Favorites', count: 10, created: 1700000000, updated: 1700002000 }
          ]
        })
      })

      const result = await getBookmarkFolders()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[0].title).toBe('Watch Later')
      expect(result[0].count).toBe(5)
      expect(result[1].id).toBe(2)
      expect(result[1].title).toBe('Favorites')
      expect(result[1].count).toBe(10)
    })

    it('handles empty folders list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getBookmarkFolders()

      expect(result).toHaveLength(0)
    })

    it('handles missing count gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 1, title: 'Empty Folder' }]
        })
      })

      const result = await getBookmarkFolders()

      expect(result[0].count).toBe(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getBookmarkFolders()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getBookmarkFolders()).rejects.toThrow(ApiError)
    })
  })

  describe('getBookmarkItems', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches items by folder id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Test Movie',
              type: 'movie',
              year: 2023,
              plot: 'A test movie',
              posters: { small: 'http://s.jpg', medium: 'http://m.jpg', big: 'http://b.jpg' },
              rating: 8.5,
              imdb_rating: 7.8,
              kinopoisk_rating: 8.2,
              views: 1000
            }
          ]
        })
      })

      await getBookmarkItems(1)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/bookmarks/1')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses items correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Test Movie',
              type: 'movie',
              year: 2023,
              plot: 'A test movie',
              posters: { small: 'http://s.jpg', medium: 'http://m.jpg', big: 'http://b.jpg' },
              rating: 8.5,
              imdb_rating: 7.8,
              kinopoisk_rating: 8.2,
              views: 1000
            },
            {
              id: 456,
              title: 'Test Series',
              type: 'serial',
              year: 2022,
              plot: 'A test series',
              posters: { small: 'http://s2.jpg', medium: 'http://m2.jpg', big: 'http://b2.jpg' },
              rating: 9.0,
              imdb_rating: 8.5,
              kinopoisk_rating: 9.2,
              views: 5000
            }
          ]
        })
      })

      const result = await getBookmarkItems(1)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(123)
      expect(result[0].title).toBe('Test Movie')
      expect(result[0].imdbRating).toBe(7.8)
      expect(result[0].kinopoiskRating).toBe(8.2)
      expect(result[1].id).toBe(456)
      expect(result[1].title).toBe('Test Series')
    })

    it('handles empty items list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getBookmarkItems(1)

      expect(result).toHaveLength(0)
    })

    it('handles missing optional fields gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Minimal Item',
              type: 'movie',
              year: 2023,
              posters: {}
            }
          ]
        })
      })

      const result = await getBookmarkItems(1)

      expect(result[0].plot).toBe('')
      expect(result[0].rating).toBe(0)
      expect(result[0].imdbRating).toBe(0)
      expect(result[0].kinopoiskRating).toBe(0)
      expect(result[0].views).toBe(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(getBookmarkItems(999)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getBookmarkItems(1)).rejects.toThrow(ApiError)
    })
  })

  describe('createBookmarkFolder', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends POST request to create endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ folder: { id: 5, title: 'New Folder' } })
      })

      await createBookmarkFolder('New Folder')

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/bookmarks/create')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('sends title in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ folder: { id: 5, title: 'My Folder' } })
      })

      await createBookmarkFolder('My Folder')

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.title).toBe('My Folder')
    })

    it('returns created folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ folder: { id: 5, title: 'New Folder' } })
      })

      const result = await createBookmarkFolder('New Folder')

      expect(result.id).toBe(5)
      expect(result.title).toBe('New Folder')
      expect(result.count).toBe(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      await expect(createBookmarkFolder('Test')).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(createBookmarkFolder('Test')).rejects.toThrow(ApiError)
    })
  })

  describe('addToBookmark', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends POST request to add endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await addToBookmark(123, 1)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/bookmarks/add')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('sends item and folder in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await addToBookmark(123, 5)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.item).toBe(123)
      expect(body.folder).toBe(5)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      await expect(addToBookmark(123, 1)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(addToBookmark(123, 1)).rejects.toThrow(ApiError)
    })
  })

  describe('removeFromBookmark', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends POST request to remove-item endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await removeFromBookmark(123, 1)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/bookmarks/remove-item')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('sends item and folder in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await removeFromBookmark(456, 2)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.item).toBe(456)
      expect(body.folder).toBe(2)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(removeFromBookmark(123, 1)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(removeFromBookmark(123, 1)).rejects.toThrow(ApiError)
    })
  })

  describe('deleteBookmarkFolder', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends POST request to remove-folder endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await deleteBookmarkFolder(1)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/bookmarks/remove-folder')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('sends folder id in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await deleteBookmarkFolder(5)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.folder).toBe(5)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(deleteBookmarkFolder(999)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(deleteBookmarkFolder(1)).rejects.toThrow(ApiError)
    })
  })

  describe('getSimilarItems', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches similar items by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 456,
              title: 'Similar Movie',
              type: 'movie',
              year: 2023,
              plot: 'A similar movie',
              posters: { small: 'http://s.jpg', medium: 'http://m.jpg', big: 'http://b.jpg' },
              rating: 8.0,
              imdb_rating: 7.5,
              kinopoisk_rating: 8.0,
              views: 500
            }
          ]
        })
      })

      await getSimilarItems(123)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/items/similar?id=123')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses items correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 456,
              title: 'Similar Movie 1',
              type: 'movie',
              year: 2023,
              plot: 'A similar movie',
              posters: { small: 'http://s.jpg', medium: 'http://m.jpg', big: 'http://b.jpg' },
              rating: 8.0,
              imdb_rating: 7.5,
              kinopoisk_rating: 8.0,
              views: 500
            },
            {
              id: 789,
              title: 'Similar Movie 2',
              type: 'movie',
              year: 2022,
              plot: 'Another similar movie',
              posters: { small: 'http://s2.jpg', medium: 'http://m2.jpg', big: 'http://b2.jpg' },
              rating: 7.5,
              imdb_rating: 7.0,
              kinopoisk_rating: 7.5,
              views: 300
            }
          ]
        })
      })

      const result = await getSimilarItems(123)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(456)
      expect(result[0].title).toBe('Similar Movie 1')
      expect(result[0].imdbRating).toBe(7.5)
      expect(result[1].id).toBe(789)
      expect(result[1].title).toBe('Similar Movie 2')
    })

    it('handles empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getSimilarItems(123)

      expect(result).toHaveLength(0)
    })

    it('handles missing optional fields gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 456,
              title: 'Minimal Item',
              type: 'movie',
              year: 2023,
              posters: {}
            }
          ]
        })
      })

      const result = await getSimilarItems(123)

      expect(result[0].plot).toBe('')
      expect(result[0].rating).toBe(0)
      expect(result[0].imdbRating).toBe(0)
      expect(result[0].kinopoiskRating).toBe(0)
      expect(result[0].views).toBe(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(getSimilarItems(999)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getSimilarItems(123)).rejects.toThrow(ApiError)
    })
  })

  describe('getCollections', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches collections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Best Movies 2023', count: 50, posters: { small: 'http://s.jpg' } }
          ]
        })
      })

      await getCollections()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/collections')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses collections correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Best Movies 2023', count: 50, posters: { small: 'http://s.jpg' } },
            { id: 2, title: 'Classic Films', count: 100, posters: { small: 'http://s2.jpg' } }
          ]
        })
      })

      const result = await getCollections()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[0].title).toBe('Best Movies 2023')
      expect(result[0].count).toBe(50)
      expect(result[1].id).toBe(2)
    })

    it('handles empty collections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getCollections()

      expect(result).toHaveLength(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getCollections()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getCollections()).rejects.toThrow(ApiError)
    })
  })

  describe('getCollectionItems', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches collection items by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Movie in Collection',
              type: 'movie',
              year: 2023,
              posters: {}
            }
          ]
        })
      })

      await getCollectionItems(1)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/collections/view?id=1')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses items correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Movie 1',
              type: 'movie',
              year: 2023,
              plot: 'A movie',
              posters: { small: 'http://s.jpg' },
              rating: 8.0,
              imdb_rating: 7.5,
              kinopoisk_rating: 8.0,
              views: 500
            }
          ]
        })
      })

      const result = await getCollectionItems(1)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(123)
      expect(result[0].title).toBe('Movie 1')
      expect(result[0].imdbRating).toBe(7.5)
    })

    it('handles empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getCollectionItems(1)

      expect(result).toHaveLength(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(getCollectionItems(999)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getCollectionItems(1)).rejects.toThrow(ApiError)
    })
  })

  describe('getHistory', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Watched Movie',
              type: 'movie',
              year: 2023,
              posters: {},
              watched_at: 1700000000
            }
          ]
        })
      })

      await getHistory()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/history')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses items with watchedAt correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 123,
              title: 'Watched Movie',
              type: 'movie',
              year: 2023,
              plot: 'A movie',
              posters: { small: 'http://s.jpg' },
              rating: 8.0,
              imdb_rating: 7.5,
              kinopoisk_rating: 8.0,
              views: 500,
              watched_at: 1700000000
            }
          ]
        })
      })

      const result = await getHistory()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(123)
      expect(result[0].title).toBe('Watched Movie')
      expect(result[0].watchedAt).toBe(1700000000)
    })

    it('handles empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getHistory()

      expect(result).toHaveLength(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getHistory()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getHistory()).rejects.toThrow(ApiError)
    })
  })

  describe('clearHistoryForItem', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends POST request to clear-for-item endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await clearHistoryForItem(123)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/history/clear-for-item')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('sends item id in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await clearHistoryForItem(456)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.id).toBe(456)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await expect(clearHistoryForItem(999)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(clearHistoryForItem(123)).rejects.toThrow(ApiError)
    })
  })

  describe('toggleWatchlist', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('sends POST request to togglewatchlist endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await toggleWatchlist(123)

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/watching/togglewatchlist')
      expect(call[1].method).toBe('POST')
      expect(call[1].headers['Content-Type']).toBe('application/json')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('sends item id in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await toggleWatchlist(456)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.id).toBe(456)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      await expect(toggleWatchlist(123)).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(toggleWatchlist(123)).rejects.toThrow(ApiError)
    })
  })

  describe('getGenres', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches genres', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Action' },
            { id: 2, title: 'Comedy' }
          ]
        })
      })

      await getGenres()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/genres')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses genres correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Action' },
            { id: 2, title: 'Comedy' },
            { id: 3, title: 'Drama' }
          ]
        })
      })

      const result = await getGenres()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe(1)
      expect(result[0].title).toBe('Action')
      expect(result[1].title).toBe('Comedy')
    })

    it('handles empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getGenres()

      expect(result).toHaveLength(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getGenres()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getGenres()).rejects.toThrow(ApiError)
    })
  })

  describe('getCountries', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches countries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'USA' },
            { id: 2, title: 'UK' }
          ]
        })
      })

      await getCountries()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/countries')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses countries correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'USA' },
            { id: 2, title: 'UK' },
            { id: 3, title: 'Russia' }
          ]
        })
      })

      const result = await getCountries()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe(1)
      expect(result[0].title).toBe('USA')
      expect(result[2].title).toBe('Russia')
    })

    it('handles empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getCountries()

      expect(result).toHaveLength(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getCountries()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getCountries()).rejects.toThrow(ApiError)
    })
  })

  describe('getContentTypes', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches content types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'movie', title: 'Movies' },
            { id: 'serial', title: 'TV Series' }
          ]
        })
      })

      await getContentTypes()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/types')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses content types correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'movie', title: 'Movies' },
            { id: 'serial', title: 'TV Series' },
            { id: 'concert', title: 'Concerts' }
          ]
        })
      })

      const result = await getContentTypes()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('movie')
      expect(result[0].title).toBe('Movies')
      expect(result[1].id).toBe('serial')
    })

    it('handles empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getContentTypes()

      expect(result).toHaveLength(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getContentTypes()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getContentTypes()).rejects.toThrow(ApiError)
    })
  })

  describe('getTVChannels', () => {
    beforeEach(() => {
      const tokens = {
        access: 'valid-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
      localStorage.setItem('kpuppy_tokens', JSON.stringify(tokens))
    })

    it('fetches TV channels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Channel 1', url: 'http://stream.m3u8', logo: 'http://logo.png' }
          ]
        })
      })

      await getTVChannels()

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe('https://api.service-kp.com/v1/tv')
      expect(call[1].headers['Authorization']).toBe('Bearer valid-token')
    })

    it('parses TV channels correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Channel 1', url: 'http://stream1.m3u8', logo: 'http://logo1.png' },
            { id: 2, title: 'Channel 2', url: 'http://stream2.m3u8', logo: 'http://logo2.png' }
          ]
        })
      })

      const result = await getTVChannels()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[0].title).toBe('Channel 1')
      expect(result[0].url).toBe('http://stream1.m3u8')
      expect(result[0].logo).toBe('http://logo1.png')
    })

    it('handles channels without url or logo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 1, title: 'Basic Channel' }
          ]
        })
      })

      const result = await getTVChannels()

      expect(result[0].url).toBeUndefined()
      expect(result[0].logo).toBeUndefined()
    })

    it('parses channels with stream and logos fields (actual API format)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          channels: [
            { id: 1, title: 'Match TV', name: 'matchtv', stream: 'http://stream.m3u8', logos: { s: 'http://small.png', m: 'http://medium.png' } },
            { id: 2, name: 'Sport', stream: 'http://sport.m3u8', logos: { s: 'http://sport-logo.png' } }
          ]
        })
      })

      const result = await getTVChannels()

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Match TV')
      expect(result[0].url).toBe('http://stream.m3u8')
      expect(result[0].logo).toBe('http://small.png')
      expect(result[1].title).toBe('Sport')
      expect(result[1].url).toBe('http://sport.m3u8')
    })

    it('handles empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] })
      })

      const result = await getTVChannels()

      expect(result).toHaveLength(0)
    })

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(getTVChannels()).rejects.toThrow(ApiError)
    })

    it('throws ApiError when not authenticated', async () => {
      localStorage.clear()

      await expect(getTVChannels()).rejects.toThrow(ApiError)
    })
  })
})
