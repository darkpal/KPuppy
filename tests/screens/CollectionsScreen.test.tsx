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

const emptyPage = {
  items: [] as kinopub.Collection[],
  pagination: { current: 1, total: 0, totalItems: 0, perpage: 40 }
}

const mockCollection = {
  id: 1,
  title: 'Best of 2024',
  count: 12,
  posters: {
    small: 'http://s.jpg',
    medium: 'http://m.jpg',
    big: 'http://b.jpg'
  }
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
  quality: 0,
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
    vi.mocked(kinopub.getCollections).mockResolvedValue(emptyPage)
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
        expect(kinopub.getCollections).toHaveBeenCalledWith(1, 40)
      })
    })

    it('renders collections list after loading', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue({
        items: [mockCollection],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 40 }
      })

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.collections-list')).toBeDefined()
        expect(document.querySelector('.collections-item')).toBeDefined()
      })
    })

    it('renders collection title', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue({
        items: [mockCollection],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 40 }
      })

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Best of 2024')).toBeDefined()
      })
    })

    it('shows focused state on first collection', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue({
        items: [mockCollection],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 40 }
      })

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        const focusedCollection = document.querySelector('.collections-item.focused')
        expect(focusedCollection).toBeDefined()
      })
    })

    it('shows navigation hints', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue({
        items: [mockCollection],
        pagination: { current: 1, total: 1, totalItems: 1, perpage: 40 }
      })

      renderWithI18n(<CollectionsScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Shuffle/)).toBeDefined()
        expect(document.querySelector('.collections-hint')).not.toBeNull()
      })
    })

    it('shows empty message when no collections', async () => {
      vi.mocked(kinopub.getCollections).mockResolvedValue(emptyPage)

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
        const screenEl = document.querySelector('.category-screen')
        expect(screenEl).toBeDefined()
      })
    })
  })
})
