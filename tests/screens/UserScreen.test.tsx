import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { UserScreen } from '../../src/screens/UserScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as kinopub from '../../src/api/kinopub'

vi.mock('../../src/api/kinopub', () => ({
  getUser: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

const mockUser = {
  username: 'testuser',
  avatar: 'https://example.com/avatar.jpg',
  subscription: {
    active: true,
    endTime: Math.floor(Date.now() / 1000) + 86400 * 30,
    days: 30,
  },
}

const mockInactiveUser = {
  username: 'inactiveuser',
  avatar: '',
  subscription: {
    active: false,
    endTime: 0,
    days: 0,
  },
}

describe('UserScreen', () => {
  const mockProps = {
    onNavigateToMenu: vi.fn(),
    onLogout: vi.fn(),
    isActive: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(kinopub.getUser).mockResolvedValue(mockUser)
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      vi.mocked(kinopub.getUser).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<UserScreen {...mockProps} />)

      expect(document.querySelector('.user-spinner')).toBeDefined()
    })

    it('shows title during loading', () => {
      vi.mocked(kinopub.getUser).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<UserScreen {...mockProps} />)

      expect(screen.getByText('Profile')).toBeDefined()
    })
  })

  describe('user info display', () => {
    it('fetches user on mount', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(kinopub.getUser).toHaveBeenCalled()
      })
    })

    it('renders user screen container after loading', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.user-screen')).toBeDefined()
      })
    })

    it('renders username', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeDefined()
      })
    })

    it('renders user card', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.user-card')).toBeDefined()
      })
    })

    it('renders avatar when available', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        const avatar = document.querySelector('.user-avatar-image') as HTMLImageElement
        expect(avatar).toBeDefined()
        expect(avatar.src).toBe('https://example.com/avatar.jpg')
      })
    })

    it('renders avatar placeholder when no avatar', async () => {
      vi.mocked(kinopub.getUser).mockResolvedValue(mockInactiveUser)

      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.user-avatar-placeholder')).toBeDefined()
      })
    })
  })

  describe('subscription info', () => {
    it('shows active subscription badge', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeDefined()
      })
    })

    it('shows inactive subscription badge when inactive', async () => {
      vi.mocked(kinopub.getUser).mockResolvedValue(mockInactiveUser)

      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeDefined()
      })
    })

    it('shows days left for active subscription', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('30')).toBeDefined()
      })
    })

    it('shows subscription status label', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subscription')).toBeDefined()
      })
    })
  })

  describe('logout button', () => {
    it('renders logout button', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeDefined()
      })
    })

    it('shows focused state on logout button', async () => {
      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        const button = document.querySelector('.user-logout-button.focused')
        expect(button).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      vi.mocked(kinopub.getUser).mockRejectedValue(new Error('API Error'))

      renderWithI18n(<UserScreen {...mockProps} />)

      await waitFor(() => {
        const screen = document.querySelector('.user-screen')
        expect(screen).toBeDefined()
      })
    })
  })
})
