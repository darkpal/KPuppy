import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { SearchScreen } from '../../src/screens/SearchScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'
import * as storage from '../../src/storage'

vi.mock('../../src/api/kinopub', () => ({
  searchItems: vi.fn(),
  getContentTypes: vi.fn(),
}))

vi.mock('../../src/storage', () => ({
  getContentTypesCache: vi.fn(() => null),
  saveContentTypesCache: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

describe('SearchScreen', () => {
  const mockProps = {
    onBack: vi.fn(),
    onSelectItem: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.searchItems).mockResolvedValue({ items: [], pagination: { current: 1, total: 1, totalItems: 0, perpage: 48 } })
    vi.mocked(kinopub.getContentTypes).mockResolvedValue([])
    vi.mocked(storage.getContentTypesCache).mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders search screen container', () => {
      renderWithI18n(<SearchScreen {...mockProps} />)

      expect(document.querySelector('.search-screen')).toBeDefined()
    })

    it('renders search icon', () => {
      renderWithI18n(<SearchScreen {...mockProps} />)

      expect(document.querySelector('.search-icon')).toBeDefined()
    })

    it('renders search input container', () => {
      renderWithI18n(<SearchScreen {...mockProps} />)

      expect(document.querySelector('.search-input-container')).toBeDefined()
    })
  })

  describe('query input', () => {
    it('does not render the on-screen letter keyboard', () => {
      renderWithI18n(<SearchScreen {...mockProps} />)

      expect(document.querySelector('.keyboard')).toBeNull()
      expect(document.querySelectorAll('.keyboard-key').length).toBe(0)
    })

    it('renders a real text input for the system keyboard', () => {
      renderWithI18n(<SearchScreen {...mockProps} />)

      const input = document.querySelector('.search-query-input') as HTMLInputElement | null
      expect(input).not.toBeNull()
      expect(input?.type).toBe('text')
    })

    it('focuses the query field by default', () => {
      renderWithI18n(<SearchScreen {...mockProps} />)

      expect(document.querySelector('.search-input-container.focused')).not.toBeNull()
    })
  })

  describe('search results', () => {
    it('shows search hint when no query', () => {
      renderWithI18n(<SearchScreen {...mockProps} />)

      expect(document.querySelector('.search-hint')).toBeDefined()
    })

    it('shows loading spinner during search', async () => {
      vi.mocked(kinopub.searchItems).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<SearchScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.search-screen')).toBeDefined()
      })
    })
  })

  describe('content types filter', () => {
    it('loads content types on mount', async () => {
      renderWithI18n(<SearchScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getContentTypes).toHaveBeenCalled()
      })
    })

    it('uses cached content types when available', async () => {
      const cachedTypes = [{ id: 'movie', title: 'Movies' }]
      vi.mocked(storage.getContentTypesCache).mockReturnValue(cachedTypes)

      renderWithI18n(<SearchScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getContentTypes).not.toHaveBeenCalled()
      })
    })

    it('renders filter button when content types available', async () => {
      vi.mocked(kinopub.getContentTypes).mockResolvedValue([
        { id: 'movie', title: 'Movies', type: 'movie' }
      ])

      renderWithI18n(<SearchScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.search-filter')).toBeDefined()
      })
    })
  })
})
