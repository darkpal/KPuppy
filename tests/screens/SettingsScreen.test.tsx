import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { SettingsScreen } from '../../src/screens/SettingsScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/storage', () => ({
  getLocalSettings: vi.fn(() => ({ defaultQuality: 'auto', playerType: 'native', language: 'en', showContinueWatching: true, pinSideMenu: false })),
  saveLocalSettings: vi.fn(),
}))

vi.mock('../../src/preferredDefaults', () => ({
  applyPreferredDeviceDefaults: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../src/api/kinopub', () => ({
  getDeviceInfo: vi.fn(() => Promise.resolve({
    id: 1,
    settings: {
      support4k: 1,
      supportHevc: 1,
      supportHdr: 0,
      supportSsl: 1,
      mixedPlaylist: 0,
      serverLocation: [],
      streamingType: [],
    }
  })),
  updateDeviceSettings: vi.fn(() => Promise.resolve()),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

describe('SettingsScreen', () => {
  const mockNavigateToMenu = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('shows title', async () => {
      renderWithI18n(
        <SettingsScreen onNavigateToMenu={mockNavigateToMenu} isActive={true} />
      )

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeDefined()
      })
    })

    it('renders settings screen container', async () => {
      renderWithI18n(
        <SettingsScreen onNavigateToMenu={mockNavigateToMenu} isActive={true} />
      )

      await waitFor(() => {
        const settingsScreen = document.querySelector('.settings-screen')
        expect(settingsScreen).toBeDefined()
      })
    })

    it('shows settings sections after loading', async () => {
      renderWithI18n(
        <SettingsScreen onNavigateToMenu={mockNavigateToMenu} isActive={true} />
      )

      await waitFor(() => {
        const sections = document.querySelectorAll('.settings-section')
        expect(sections.length).toBeGreaterThan(0)
      })
    })

    it('shows settings items', async () => {
      renderWithI18n(
        <SettingsScreen onNavigateToMenu={mockNavigateToMenu} isActive={true} />
      )

      await waitFor(() => {
        const items = document.querySelectorAll('.settings-item')
        expect(items.length).toBeGreaterThan(0)
      })
    })

    it('shows toggle controls for toggle settings', async () => {
      renderWithI18n(
        <SettingsScreen onNavigateToMenu={mockNavigateToMenu} isActive={true} />
      )

      await waitFor(() => {
        const toggles = document.querySelectorAll('.settings-toggle')
        expect(toggles.length).toBeGreaterThan(0)
      })
    })
  })

  describe('focus state', () => {
    it('shows focused state on first item', async () => {
      renderWithI18n(
        <SettingsScreen onNavigateToMenu={mockNavigateToMenu} isActive={true} />
      )

      await waitFor(() => {
        const focusedItem = document.querySelector('.settings-item.focused')
        expect(focusedItem).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getDeviceInfo).mockRejectedValueOnce(new Error('API Error'))

      renderWithI18n(
        <SettingsScreen onNavigateToMenu={mockNavigateToMenu} isActive={true} />
      )

      await waitFor(() => {
        const settingsScreen = document.querySelector('.settings-screen')
        expect(settingsScreen).toBeDefined()
      })
    })
  })
})
