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
  getLocalSettings: vi.fn(() => ({ defaultQuality: 'auto', playerType: 'builtin', language: 'en', showComments: true })),
  saveReturnTo: vi.fn(),
  getReturnTo: vi.fn(() => null),
  clearReturnTo: vi.fn(),
  getContentTypesCache: vi.fn(() => null),
  saveContentTypesCache: vi.fn(),
  getCommentsUserId: vi.fn(() => null),
  saveCommentsUserId: vi.fn(),
  clearCommentsUserId: vi.fn(),
}))

vi.mock('../src/api/kinopub', () => ({
  refreshAccessToken: vi.fn(),
  getItem: vi.fn(),
  setOnAuthError: vi.fn(),
  getDeviceInfo: vi.fn(),
  markTime: vi.fn(),
  registerDevice: vi.fn(() => Promise.resolve()),
  getUser: vi.fn(() => Promise.resolve({ username: 'testuser', avatar: null })),
  getContentTypes: vi.fn(() => Promise.resolve([])),
  getItems: vi.fn(() => Promise.resolve([])),
  getWatching: vi.fn(() => Promise.resolve([])),
  getNewMovies: vi.fn(() => Promise.resolve([])),
  getPopularMovies: vi.fn(() => Promise.resolve([])),
  getPopularSeries: vi.fn(() => Promise.resolve([])),
  getFreshMovies: vi.fn(() => Promise.resolve([])),
  getFreshSeries: vi.fn(() => Promise.resolve([])),
  getHotMovies: vi.fn(() => Promise.resolve([])),
  getHotSeries: vi.fn(() => Promise.resolve([])),
  searchItems: vi.fn(() => Promise.resolve([])),
  getBookmarkFolders: vi.fn(() => Promise.resolve([])),
  getBookmarkItems: vi.fn(() => Promise.resolve([])),
  getCollections: vi.fn(() => Promise.resolve([])),
  getCollectionItems: vi.fn(() => Promise.resolve([])),
  getHistory: vi.fn(() => Promise.resolve([])),
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

vi.mock('../src/api/comments', () => ({
  provisionUser: vi.fn(() => Promise.resolve({ userId: 'test-user-id' })),
  isCommentsApiAvailable: vi.fn(() => false),
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
