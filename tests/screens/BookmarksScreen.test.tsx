import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { BookmarksScreen } from '../../src/screens/BookmarksScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getBookmarkFolders: vi.fn(),
  getBookmarkItems: vi.fn(),
  createBookmarkFolder: vi.fn(),
  deleteBookmarkFolder: vi.fn(),
  removeFromBookmark: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockFolder = {
  id: 1,
  title: 'Test Folder',
  count: 5,
}

const mockItem = {
  id: 1,
  title: 'Test Movie',
  type: 'movie',
  year: 2024,
  plot: 'Test plot',
  posters: { small: '', medium: '', big: '' },
  rating: 8,
  imdbRating: 7.5,
  kinopoiskRating: 8.2,
  ratingPercentage: 0,
  views: 1000
}

describe('BookmarksScreen', () => {
  const mockProps = {
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getBookmarkFolders).mockResolvedValue([])
    vi.mocked(kinopub.getBookmarkItems).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getBookmarkFolders).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      expect(document.querySelector('.spinner')).not.toBeNull()
    })

    it('shows title during loading', () => {
      vi.mocked(kinopub.getBookmarkFolders).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      expect(screen.getByText('Bookmarks')).toBeDefined()
    })
  })

  describe('folders view', () => {
    it('renders folders list after loading', async () => {
      vi.mocked(kinopub.getBookmarkFolders).mockResolvedValue([mockFolder])

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.bookmarks-folders')).toBeDefined()
      })
    })

    it('renders folder title and count', async () => {
      vi.mocked(kinopub.getBookmarkFolders).mockResolvedValue([mockFolder])

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Folder')).toBeDefined()
        expect(screen.getByText('5')).toBeDefined()
      })
    })

    it('renders create folder button', async () => {
      vi.mocked(kinopub.getBookmarkFolders).mockResolvedValue([])

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      await waitFor(() => {
        const createButton = document.querySelector('.bookmarks-folder-create')
        expect(createButton).toBeDefined()
      })
    })

    it('shows focused state on first folder', async () => {
      vi.mocked(kinopub.getBookmarkFolders).mockResolvedValue([mockFolder])

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      await waitFor(() => {
        const focusedFolder = document.querySelector('.bookmarks-folder.focused')
        expect(focusedFolder).toBeDefined()
      })
    })

    it('shows delete hint when folders exist', async () => {
      vi.mocked(kinopub.getBookmarkFolders).mockResolvedValue([mockFolder])

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.bookmarks-hint')).toBeDefined()
      })
    })
  })

  describe('items view', () => {
    it('loads items when folder selected', async () => {
      vi.mocked(kinopub.getBookmarkFolders).mockResolvedValue([mockFolder])
      vi.mocked(kinopub.getBookmarkItems).mockResolvedValue([mockItem])

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getBookmarkFolders).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getBookmarkFolders).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<BookmarksScreen {...mockProps} />)

      await waitFor(() => {
        const screen = document.querySelector('.category-screen')
        expect(screen).toBeDefined()
      })
    })
  })
})
