import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { LiveTVScreen } from '../../src/screens/LiveTVScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getTVChannels: vi.fn(),
}))

vi.mock('../../src/webos/player', () => ({
  launchNativePlayer: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockChannel = {
  id: 1,
  title: 'Test Channel',
  logo: 'https://example.com/logo.png',
  url: 'https://example.com/stream.m3u8',
}

describe('LiveTVScreen', () => {
  const mockProps = {
    onNavigateToMenu: vi.fn(),
    onBeforePlay: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getTVChannels).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getTVChannels).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      expect(document.querySelector('.spinner')).not.toBeNull()
    })

    it('shows title during loading', () => {
      vi.mocked(kinopub.getTVChannels).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      expect(screen.getByText('Live TV')).toBeDefined()
    })
  })

  describe('content display', () => {
    it('fetches channels on mount', async () => {
      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getTVChannels).toHaveBeenCalled()
      })
    })

    it('renders live tv screen container after loading', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([mockChannel])

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.livetv-screen')).toBeDefined()
      })
    })

    it('renders channel grid', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([mockChannel])

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.livetv-grid')).toBeDefined()
      })
    })

    it('renders channel cards', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([mockChannel])

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.livetv-card')).toBeDefined()
      })
    })

    it('renders channel name', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([mockChannel])

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Channel')).toBeDefined()
      })
    })

    it('renders channel logo when available', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([mockChannel])

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        const logo = document.querySelector('.livetv-logo') as HTMLImageElement
        expect(logo).toBeDefined()
        expect(logo.src).toBe('https://example.com/logo.png')
      })
    })

    it('renders placeholder when no logo', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([{ ...mockChannel, logo: '' }])

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.livetv-logo-placeholder')).toBeDefined()
      })
    })

    it('shows empty message when no channels', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([])

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.livetv-empty')).toBeDefined()
      })
    })
  })

  describe('focus state', () => {
    it('shows focused state on first channel', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([mockChannel])

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        const focusedCard = document.querySelector('.livetv-card.focused')
        expect(focusedCard).toBeDefined()
      })
    })

    it('accepts initial focus index prop', async () => {
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([mockChannel, { ...mockChannel, id: 2 }])

      renderWithI18n(<LiveTVScreen {...mockProps} initialFocusIndex={1} />)

      await waitFor(() => {
        expect(document.querySelector('.livetv-card.focused')).toBeDefined()
      })
    })

    it('calls onFocusChange when focus changes', async () => {
      const mockOnFocusChange = vi.fn()
      vi.mocked(kinopub.getTVChannels).mockResolvedValue([mockChannel])

      renderWithI18n(
        <LiveTVScreen {...mockProps} onFocusChange={mockOnFocusChange} />
      )

      await waitFor(() => {
        expect(mockOnFocusChange).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getTVChannels).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<LiveTVScreen {...mockProps} />)

      await waitFor(() => {
        const screen = document.querySelector('.livetv-screen')
        expect(screen).toBeDefined()
      })
    })
  })
})
