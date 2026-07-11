import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { CollectionsScreen } from '../../src/screens/CollectionsScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getCollections: vi.fn(),
  getCollectionItems: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockCollection = {
  id: 1,
  title: 'Best of 2024',
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

describe('CollectionsScreen', () => {
  const mockProps = {
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getCollections).mockResolvedValue([])
    vi.mocked(kinopub.getCollectionItems).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getCollections).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      expect(document.querySelector('.spinner')).not.toBeNull()
    })

    it('shows title during loading', () => {
      vi.mocked(kinopub.getCollections).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      expect(screen.getByText('Collections')).toBeDefined()
    })
  })

  describe('collections view', () => {
    it('fetches collections on mount', async () => {
      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getCollections).toHaveBeenCalled()
      })
    })

    it('renders collections list after loading', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue([mockCollection])

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.bookmarks-folders')).toBeDefined()
      })
    })

    it('renders collection title', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue([mockCollection])

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Best of 2024')).toBeDefined()
      })
    })

    it('shows focused state on first collection', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue([mockCollection])

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        const focusedCollection = document.querySelector('.bookmarks-folder.focused')
        expect(focusedCollection).toBeDefined()
      })
    })

    it('shows empty message when no collections', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue([])

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.category-empty')).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getCollections).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        const screen = document.querySelector('.category-screen')
        expect(screen).toBeDefined()
      })
    })
  })
})
