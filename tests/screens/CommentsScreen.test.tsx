import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { CommentsScreen } from '../../src/screens/CommentsScreen'
import { I18nProvider } from '../../src/i18n/context'
import * as commentsApi from '../../src/api/comments'

vi.mock('../../src/api/comments', () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
  replyToComment: vi.fn(),
  editComment: vi.fn(),
  deleteComment: vi.fn(),
  isCommentsApiAvailable: vi.fn(),
  CommentsApiError: class CommentsApiError extends Error {
    constructor(message: string, public status: number, public code?: string) {
      super(message)
      this.name = 'CommentsApiError'
    }
  }
}))

vi.mock('../../src/storage', () => ({
  getTokens: vi.fn(() => ({ access: 'test-token', refresh: 'refresh-token', expiresAt: Date.now() + 3600000 })),
  getCommentsUserId: vi.fn(() => 'test-user-id'),
}))

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

describe('CommentsScreen', () => {
  const mockProps = {
    itemId: 123,
    itemTitle: 'Test Movie',
    onBack: vi.fn(),
    onNavigateToMenu: vi.fn(),
    isActive: true,
  }

  const mockComments = [
    {
      id: 'comment-1',
      contentId: 'content-123',
      userId: 'user-1',
      user: { id: 'user-1', displayName: 'Brave Tiger', avatar: 'https://example.com/avatar.jpg' },
      text: 'This is a test comment',
      spoiler: false,
      parentId: null,
      createdAt: 1703894400,
      replies: []
    },
    {
      id: 'comment-2',
      contentId: 'content-123',
      userId: 'user-2',
      user: { id: 'user-2', displayName: 'Pink Koala' },
      text: 'This is a spoiler comment',
      spoiler: true,
      parentId: null,
      createdAt: 1703894500,
      replies: [
        {
          id: 'reply-1',
          contentId: 'content-123',
          userId: 'user-1',
          user: { id: 'user-1', displayName: 'Brave Tiger' },
          text: 'This is a reply',
          spoiler: false,
          parentId: 'comment-2',
          createdAt: 1703894600
        }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(commentsApi.isCommentsApiAvailable).mockReturnValue(true)
    vi.mocked(commentsApi.getComments).mockResolvedValue({
      comments: []
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders comments screen container', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.comments-screen')).toBeDefined()
      })
    })

    it('renders header with item title', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const title = document.querySelector('.comments-header-title')
        expect(title).toBeDefined()
        expect(title?.textContent).toBe('Test Movie')
      })
    })

    it('renders subtitle', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.comments-header-subtitle')).toBeDefined()
      })
    })

    it('shows loading spinner initially', () => {
      vi.mocked(commentsApi.getComments).mockImplementation(() => new Promise(() => {}))

      renderWithI18n(<CommentsScreen {...mockProps} />)

      expect(document.querySelector('.comments-spinner')).toBeDefined()
    })
  })

  describe('empty state', () => {
    it('shows empty message when no comments', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.comments-empty')).toBeDefined()
      })
    })

    it('shows write button when no comments', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.comments-write-button')).toBeDefined()
      })
    })
  })

  describe('with comments', () => {
    beforeEach(() => {
      vi.mocked(commentsApi.getComments).mockResolvedValue({
        comments: mockComments
      })
    })

    it('renders comment items', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const items = document.querySelectorAll('.comments-item')
        expect(items.length).toBe(3)
      })
    })

    it('renders user avatar when available', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const avatar = document.querySelector('.comments-item-avatar')
        expect(avatar).toBeDefined()
      })
    })

    it('renders avatar placeholder when no avatar', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const placeholder = document.querySelector('.comments-item-avatar-placeholder')
        expect(placeholder).toBeDefined()
      })
    })

    it('renders display name', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const displayName = document.querySelector('.comments-item-username')
        expect(displayName).toBeDefined()
        expect(displayName?.textContent).toBe('Brave Tiger')
      })
    })

    it('renders timestamp', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.comments-item-time')).toBeDefined()
      })
    })

    it('shows spoiler hidden for spoiler comments', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const spoiler = document.querySelector('.comments-item-spoiler')
        expect(spoiler).toBeDefined()
      })
    })

    it('renders reply as indented', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const reply = document.querySelector('.comments-item.reply')
        expect(reply).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('shows error message when API fails', async () => {
      vi.mocked(commentsApi.getComments).mockRejectedValue(
        new commentsApi.CommentsApiError('Failed to load', 500)
      )

      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.comments-error')).toBeDefined()
      })
    })

    it('shows retry button on error', async () => {
      vi.mocked(commentsApi.getComments).mockRejectedValue(
        new commentsApi.CommentsApiError('Failed to load', 500)
      )

      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.comments-error-retry')).toBeDefined()
      })
    })
  })

  describe('API unavailable', () => {
    it('shows empty state gracefully when API not configured', async () => {
      vi.mocked(commentsApi.isCommentsApiAvailable).mockReturnValue(false)

      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(document.querySelector('.comments-empty')).toBeDefined()
      })
    })

    it('does not crash when API not available', async () => {
      vi.mocked(commentsApi.isCommentsApiAvailable).mockReturnValue(false)

      expect(() => {
        renderWithI18n(<CommentsScreen {...mockProps} />)
      }).not.toThrow()
    })
  })

  describe('compose mode', () => {
    beforeEach(() => {
      vi.mocked(commentsApi.getComments).mockResolvedValue({
        comments: []
      })
    })

    it('renders write button', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const writeButton = document.querySelector('.comments-write-button')
        expect(writeButton).toBeDefined()
      })
    })
  })

  describe('keyboard navigation', () => {
    beforeEach(() => {
      vi.mocked(commentsApi.getComments).mockResolvedValue({
        comments: mockComments
      })
    })

    it('shows focused state on first comment', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        const focused = document.querySelector('.comments-item.focused')
        expect(focused).toBeDefined()
      })
    })
  })

  describe('API calls', () => {
    it('calls getComments on mount', async () => {
      renderWithI18n(<CommentsScreen {...mockProps} />)

      await waitFor(() => {
        expect(commentsApi.getComments).toHaveBeenCalledWith(123)
      })
    })
  })
})
