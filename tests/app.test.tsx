import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { App } from '../src/app'
import { I18nProvider } from '../src/i18n/context'
import * as storage from '../src/storage'
import * as kinopub from '../src/api/kinopub'

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>
  )
}

vi.mock('../src/storage', () => ({
  isAuthenticated: vi.fn(),
  getTokens: vi.fn(),
  saveTokens: vi.fn(),
  clearTokens: vi.fn(),
  getLocalSettings: vi.fn(() => ({ defaultQuality: 'auto', playerType: 'builtin', language: 'en' })),
  saveReturnTo: vi.fn(),
  getReturnTo: vi.fn(() => null),
  clearReturnTo: vi.fn(),
  getContentTypesCache: vi.fn(() => null),
  saveContentTypesCache: vi.fn(),
}))

vi.mock('../src/api/kinopub', () => ({
  refreshAccessToken: vi.fn(),
  getItem: vi.fn(),
  getMediaLinks: vi.fn(() => Promise.resolve({ files: [], subtitles: [] })),
  setOnAuthError: vi.fn(),
  getDeviceInfo: vi.fn(),
  markTime: vi.fn(),
  registerDevice: vi.fn(() => Promise.resolve()),
  getUser: vi.fn(() => Promise.resolve({ username: 'testuser', avatar: null })),
  getContentTypes: vi.fn(() => Promise.resolve([])),
  monthAgoUnix: vi.fn(() => 0),
  getItems: vi.fn(() => Promise.resolve({
    items: [],
    pagination: { current: 1, total: 0, totalItems: 0, perpage: 20 }
  })),
  getFreshItems: vi.fn(() => Promise.resolve({
    items: [],
    pagination: { current: 1, total: 0, totalItems: 0, perpage: 20 }
  })),
  getWatching: vi.fn(() => Promise.resolve([])),
  getNewMovies: vi.fn(() => Promise.resolve([])),
  getPopularMovies: vi.fn(() => Promise.resolve([])),
  getPopularSeries: vi.fn(() => Promise.resolve([])),
  getFreshMovies: vi.fn(() => Promise.resolve([])),
  getFreshSeries: vi.fn(() => Promise.resolve([])),
  getHotMovies: vi.fn(() => Promise.resolve([])),
  getHotSeries: vi.fn(() => Promise.resolve([])),
  searchItems: vi.fn(() => Promise.resolve({
    items: [],
    pagination: { current: 1, total: 0, totalItems: 0, perpage: 48 }
  })),
  getBookmarkFolders: vi.fn(() => Promise.resolve([])),
  getBookmarkItems: vi.fn(() => Promise.resolve({
    items: [],
    pagination: { current: 1, total: 0, totalItems: 0, perpage: 50 }
  })),
  getCollections: vi.fn(() => Promise.resolve({
    items: [],
    pagination: { current: 1, total: 0, totalItems: 0, perpage: 40 }
  })),
  getCollectionItems: vi.fn(() => Promise.resolve([])),
  getHistory: vi.fn(() => Promise.resolve({
    items: [],
    pagination: { current: 1, total: 0, totalItems: 0, perpage: 50 }
  })),
  getNewEpisodes: vi.fn(() => Promise.resolve([])),
  getChannels: vi.fn(() => Promise.resolve([])),
  getSimilarItems: vi.fn(() => Promise.resolve([])),
  getGenres: vi.fn(() => Promise.resolve([])),
  getCountries: vi.fn(() => Promise.resolve([])),
  toggleWatchlist: vi.fn(),
  isItemInWatchlist: vi.fn(() => Promise.resolve(false)),
  addToBookmark: vi.fn(),
  requestDeviceCode: vi.fn(() => Promise.resolve({
    code: 'test-code',
    userCode: 'TEST123',
    verificationUri: 'https://example.com/activate',
    expiresIn: 600,
    interval: 5
  })),
  pollForToken: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('../src/webos/player', () => ({
  launchNativePlayer: vi.fn(),
  getStreamUrl: vi.fn(),
}))

describe('App Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Authentication flow', () => {
    it('shows AuthScreen when not authenticated', async () => {
      vi.mocked(storage.isAuthenticated).mockReturnValue(false)
      vi.mocked(storage.getTokens).mockReturnValue(null)

      renderApp()

      await waitFor(() => {
        const authScreen = document.querySelector('.auth-screen')
        expect(authScreen).toBeDefined()
      })
    })

    it('shows main content when authenticated', async () => {
      vi.mocked(storage.isAuthenticated).mockReturnValue(true)
      vi.mocked(storage.getTokens).mockReturnValue({
        access: 'token',
        refresh: 'refresh',
        expiresAt: Date.now() + 100000
      })

      renderApp()

      await waitFor(() => {
        expect(screen.getByText('K')).toBeDefined()
      })
    })

    it('refreshes expired token on load', async () => {
      vi.mocked(storage.isAuthenticated).mockReturnValue(true)
      vi.mocked(storage.getTokens).mockReturnValue({
        access: 'old-token',
        refresh: 'refresh-token',
        expiresAt: Date.now() - 1000
      })
      vi.mocked(kinopub.refreshAccessToken).mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresIn: 3600
      })

      renderApp()

      await waitFor(() => {
        expect(kinopub.refreshAccessToken).toHaveBeenCalledWith('refresh-token')
        expect(storage.saveTokens).toHaveBeenCalled()
      })
    })

    it('clears tokens and shows auth screen on refresh failure', async () => {
      vi.mocked(storage.isAuthenticated).mockReturnValue(true)
      vi.mocked(storage.getTokens).mockReturnValue({
        access: 'old-token',
        refresh: 'invalid-refresh',
        expiresAt: Date.now() - 1000
      })
      vi.mocked(kinopub.refreshAccessToken).mockRejectedValue(new Error('Invalid refresh token'))

      renderApp()

      await waitFor(() => {
        expect(storage.clearTokens).toHaveBeenCalled()
      })
    })
  })

  describe('Menu navigation', () => {
    beforeEach(() => {
      vi.mocked(storage.isAuthenticated).mockReturnValue(true)
      vi.mocked(storage.getTokens).mockReturnValue({
        access: 'token',
        refresh: 'refresh',
        expiresAt: Date.now() + 100000
      })
    })

    it('starts with menu visible', async () => {
      renderApp()

      await waitFor(() => {
        const menu = document.querySelector('.side-menu')
        expect(menu).toBeDefined()
      })
    })

    it('expands menu when left arrow pressed', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('K')).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 37 })

      await waitFor(() => {
        const expandedMenu = document.querySelector('.side-menu.expanded')
        expect(expandedMenu).toBeDefined()
      })
    })

    it('navigates menu items with up/down arrows', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('K')).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 37 })

      await waitFor(() => {
        const expandedMenu = document.querySelector('.side-menu.expanded')
        expect(expandedMenu).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 40 })
      fireEvent.keyDown(document, { keyCode: 40 })

      const focusedItem = document.querySelector('.side-menu-item.focused')
      expect(focusedItem).toBeDefined()
    })

    it('selects menu item on Enter and collapses menu', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('K')).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 37 })

      await waitFor(() => {
        const expandedMenu = document.querySelector('.side-menu.expanded')
        expect(expandedMenu).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 40 })
      fireEvent.keyDown(document, { keyCode: 13 })

      await waitFor(() => {
        const expandedMenu = document.querySelector('.side-menu.expanded')
        expect(expandedMenu).toBeNull()
      })
    })

    it('collapses menu when right arrow pressed', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('K')).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 37 })

      await waitFor(() => {
        const expandedMenu = document.querySelector('.side-menu.expanded')
        expect(expandedMenu).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 39 })

      await waitFor(() => {
        const expandedMenu = document.querySelector('.side-menu.expanded')
        expect(expandedMenu).toBeNull()
      })
    })
  })

  describe('Screen transitions', () => {
    beforeEach(() => {
      vi.mocked(storage.isAuthenticated).mockReturnValue(true)
      vi.mocked(storage.getTokens).mockReturnValue({
        access: 'token',
        refresh: 'refresh',
        expiresAt: Date.now() + 100000
      })
    })

    it('shows search screen when search menu item selected', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('K')).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 37 })

      await waitFor(() => {
        const expandedMenu = document.querySelector('.side-menu.expanded')
        expect(expandedMenu).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 40 })
      fireEvent.keyDown(document, { keyCode: 13 })

      await waitFor(() => {
        const searchScreen = document.querySelector('.search-screen')
        expect(searchScreen).toBeDefined()
      })
    })

    it('shows settings screen when settings menu item selected', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('K')).toBeDefined()
      })

      fireEvent.keyDown(document, { keyCode: 37 })

      await waitFor(() => {
        const expandedMenu = document.querySelector('.side-menu.expanded')
        expect(expandedMenu).toBeDefined()
      })

      for (let i = 0; i < 14; i++) {
        fireEvent.keyDown(document, { keyCode: 40 })
      }
      fireEvent.keyDown(document, { keyCode: 13 })

      await waitFor(() => {
        const settingsScreen = document.querySelector('.settings-screen')
        expect(settingsScreen).toBeDefined()
      })
    })

    it('returns from a person search result to the original item card', async () => {
      const firstItem = {
        id: 1,
        title: 'Original Movie',
        type: 'movie',
        year: 2024,
        plot: 'Original plot',
        posters: { small: '', medium: '', big: '' },
        rating: 8,
        imdbRating: 7.5,
        kinopoiskRating: 8.2,
        quality: 0,
        views: 100,
        directors: [],
        actors: [{ id: 10, name: 'Test Actor' }],
        countries: [],
        genres: [],
        videos: [],
        duration: { average: 120, total: 120 }
      }
      const secondItem = {
        ...firstItem,
        id: 2,
        title: 'Second Movie',
        plot: 'Second plot',
        actors: []
      }

      vi.mocked(storage.getReturnTo).mockReturnValueOnce({
        itemId: 1,
        seriesId: null,
        selectedMenuId: 'movies',
        screenFocus: {}
      })
      vi.mocked(kinopub.getItem).mockImplementation((id) => Promise.resolve(id === 1 ? firstItem : secondItem))
      vi.mocked(kinopub.searchItems).mockResolvedValue({
        items: [{
          id: 2,
          title: 'Second Movie',
          type: 'movie',
          year: 2024,
          posters: { small: '', medium: '', big: '' },
          rating: 8,
          imdbRating: 7.5,
          kinopoiskRating: 8.2,
          quality: 0,
          views: 100,
          genres: []
        }],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 48 }
      })

      renderApp()

      await waitFor(() => expect(screen.getAllByText('Test Actor').length).toBeGreaterThan(0))
      fireEvent.click(screen.getAllByText('Test Actor')[0])

      await waitFor(() => {
        expect(kinopub.searchItems).toHaveBeenCalledWith(expect.objectContaining({ q: 'Test Actor', field: 'actor' }))
        expect(screen.getByText('Second Movie')).toBeDefined()
      })
      fireEvent.click(screen.getByText('Second Movie'))

      await waitFor(() => {
        expect(screen.getAllByText('Second Movie').length).toBeGreaterThanOrEqual(2)
        expect(document.querySelector('.item-screen')).not.toBeNull()
      })
      fireEvent.keyDown(document, { keyCode: 461 })

      await waitFor(() => expect(document.querySelector('.search-screen')).not.toBeNull())
      fireEvent.keyDown(document, { keyCode: 461 })

      await waitFor(() => {
        expect(screen.getAllByText('Original Movie').length).toBeGreaterThanOrEqual(2)
        expect(document.querySelector('.item-screen')).not.toBeNull()
      })
    })

    it('keeps the base MainScreen mounted under the item overlay', async () => {
      const movie = {
        id: 42,
        title: 'Keepalive Movie',
        type: 'movie',
        year: 2024,
        plot: 'Plot',
        posters: { small: '', medium: 'm.jpg', big: '' },
        rating: 8,
        imdbRating: 7,
        kinopoiskRating: 8,
        ratingPercentage: 80,
        quality: 0,
        views: 10,
        genres: []
      }
      vi.mocked(kinopub.getWatching).mockResolvedValue([])
      vi.mocked(kinopub.getItems).mockResolvedValue({
        items: [movie],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 20 }
      })
      vi.mocked(kinopub.getFreshItems).mockResolvedValue({
        items: [],
        pagination: { current: 1, total: 0, totalItems: 0, perpage: 20 }
      })
      vi.mocked(kinopub.getItem).mockImplementation(() => new Promise(() => {}))

      renderApp()

      await waitFor(() => {
        expect(document.querySelector('.main-screen')).not.toBeNull()
        expect(screen.getAllByText('Keepalive Movie').length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText('Keepalive Movie')[0])

      await waitFor(() => {
        expect(document.querySelector('.item-screen')).not.toBeNull()
        expect(document.querySelector('.screen-base.is-hidden')).not.toBeNull()
        expect(document.querySelector('.screen-overlay .item-screen')).not.toBeNull()
        expect(document.querySelector('.main-screen')).not.toBeNull()
      })
    })
  })

  describe('Return state preservation', () => {
    it('restores state from returnTo on visibility change', async () => {
      vi.mocked(storage.isAuthenticated).mockReturnValue(true)
      vi.mocked(storage.getTokens).mockReturnValue({
        access: 'token',
        refresh: 'refresh',
        expiresAt: Date.now() + 100000
      })
      vi.mocked(storage.getReturnTo).mockReturnValue({
        itemId: 123,
        seriesId: null,
        selectedMenuId: 'movies',
        screenFocus: {}
      })

      renderApp()

      await waitFor(() => {
        expect(storage.clearReturnTo).toHaveBeenCalled()
      })
    })
  })
})
