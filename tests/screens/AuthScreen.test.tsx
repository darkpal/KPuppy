import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { AuthScreen } from '../../src/screens/AuthScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as useAuthModule from '../../src/hooks/useAuth'

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

describe('AuthScreen', () => {
  const mockOnAuthenticated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('shows loading spinner when loading and no user code', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        userCode: null,
        error: null,
        startAuth: vi.fn(),
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      expect(document.querySelector('.spinner')).not.toBeNull()
      expect(screen.getByText('Loading...')).toBeDefined()
    })
  })

  describe('auth code display', () => {
    it('displays user code when available', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        userCode: 'ABCD-1234',
        error: null,
        startAuth: vi.fn(),
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      expect(screen.getByText('ABCD-1234')).toBeDefined()
    })

    it('shows sign in title', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        userCode: 'ABCD-1234',
        error: null,
        startAuth: vi.fn(),
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      expect(screen.getByText('Sign In')).toBeDefined()
    })

    it('shows instructions to visit URL', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        userCode: 'ABCD-1234',
        error: null,
        startAuth: vi.fn(),
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      expect(screen.getByText(/kino.watch\/device/)).toBeDefined()
    })

    it('shows waiting indicator while polling', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        userCode: 'ABCD-1234',
        error: null,
        startAuth: vi.fn(),
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      const pollingIndicator = document.querySelector('.auth-polling')
      expect(pollingIndicator).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('displays error message when error occurs', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        userCode: null,
        error: 'Authentication failed',
        startAuth: vi.fn(),
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      expect(screen.getByText('Authentication failed')).toBeDefined()
    })

    it('shows error with correct styling', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        userCode: null,
        error: 'Network error',
        startAuth: vi.fn(),
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      const errorElement = document.querySelector('.auth-error')
      expect(errorElement).toBeDefined()
    })
  })

  describe('authentication flow', () => {
    it('calls startAuth when no user code and not loading', () => {
      const mockStartAuth = vi.fn()
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        userCode: null,
        error: null,
        startAuth: mockStartAuth,
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      expect(mockStartAuth).toHaveBeenCalled()
    })

    it('calls onAuthenticated when isAuthenticated becomes true', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        userCode: null,
        error: null,
        startAuth: vi.fn(),
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalled()
      })
    })

    it('does not call startAuth when already loading', () => {
      const mockStartAuth = vi.fn()
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        userCode: null,
        error: null,
        startAuth: mockStartAuth,
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      expect(mockStartAuth).not.toHaveBeenCalled()
    })

    it('does not call startAuth when user code exists', () => {
      const mockStartAuth = vi.fn()
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        userCode: 'ABCD-1234',
        error: null,
        startAuth: mockStartAuth,
      })

      renderWithI18n(<AuthScreen onAuthenticated={mockOnAuthenticated} />)

      expect(mockStartAuth).not.toHaveBeenCalled()
    })
  })
})
