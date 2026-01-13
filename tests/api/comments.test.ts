import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../../src/storage', () => ({
  getCommentsUserId: vi.fn(() => 'test-user-id'),
}))

vi.stubEnv('VITE_COMMENTS_API_URL', 'https://api.example.com/kpuppy')

describe('comments API', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('with API configured', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_COMMENTS_API_URL', 'https://api.example.com/kpuppy')
    })

    describe('getComments', () => {
      const mockApiResponse = {
        comments: [
          {
            id: 'comment-1',
            contentId: 'content-123',
            userId: 'user-1',
            text: 'Test comment',
            spoiler: false,
            user: { id: 'user-1', username: 'TestUser', avatar: 'https://example.com/avatar.jpg' },
            parentId: null,
            createdAt: 1705315800,
            replies: []
          }
        ]
      }

      it('returns comments response directly', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse)
        })

        const { getComments } = await import('../../src/api/comments')
        const result = await getComments(123)

        expect(result.comments).toHaveLength(1)
        expect(result.comments[0].createdAt).toBe(1705315800)
      })

      it('includes X-User-ID header when user ID is available', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse)
        })

        const { getComments } = await import('../../src/api/comments')
        await getComments(123)

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-User-ID': 'test-user-id'
            })
          })
        )
      })

      it('constructs correct URL', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockApiResponse)
        })

        const { getComments } = await import('../../src/api/comments')
        await getComments(456)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/kpuppy/content/456/comments',
          expect.any(Object)
        )
      })

      it('throws CommentsApiError on HTTP error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'server_error', message: 'Something went wrong' })
        })

        const { getComments, CommentsApiError } = await import('../../src/api/comments')
        await expect(getComments(123)).rejects.toThrow(CommentsApiError)
      })

      it('parses error message from API response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ error: 'validation_error', message: 'Invalid page number' })
        })

        const { getComments, CommentsApiError } = await import('../../src/api/comments')

        try {
          await getComments(123)
        } catch (err) {
          expect(err).toBeInstanceOf(CommentsApiError)
          expect((err as InstanceType<typeof CommentsApiError>).message).toBe('Invalid page number')
          expect((err as InstanceType<typeof CommentsApiError>).code).toBe('validation_error')
        }
      })
    })

    describe('createComment', () => {
      const mockCreatedComment = {
        id: 'new-comment',
        contentId: 'content-123',
        userId: 'user-1',
        text: 'My new comment',
        spoiler: false,
        user: { id: 'user-1', username: 'TestUser' },
        parentId: null,
        createdAt: 1705315800,
        replies: []
      }

      it('sends POST request with correct body', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreatedComment)
        })

        const { createComment } = await import('../../src/api/comments')
        await createComment(123, 'My new comment', false)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/kpuppy/content/123/comments',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ text: 'My new comment', spoiler: false })
          })
        )
      })

      it('returns comment directly', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreatedComment)
        })

        const { createComment } = await import('../../src/api/comments')
        const result = await createComment(123, 'My new comment', false)

        expect(result.createdAt).toBe(1705315800)
        expect(result.id).toBe('new-comment')
      })
    })

    describe('replyToComment', () => {
      const mockReply = {
        id: 'reply-1',
        contentId: 'content-123',
        userId: 'user-1',
        text: 'My reply',
        spoiler: false,
        user: { id: 'user-1', username: 'TestUser' },
        parentId: 'comment-123',
        createdAt: 1705315800
      }

      it('sends POST request to reply endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockReply)
        })

        const { replyToComment } = await import('../../src/api/comments')
        await replyToComment('comment-123', 'My reply', false)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/kpuppy/comments/comment-123/reply',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ text: 'My reply', spoiler: false })
          })
        )
      })
    })

    describe('editComment', () => {
      const mockEditedComment = {
        id: 'comment-1',
        contentId: 'content-123',
        userId: 'user-1',
        text: 'Updated text',
        spoiler: true,
        user: { id: 'user-1', username: 'TestUser' },
        parentId: null,
        createdAt: 1705315800
      }

      it('sends PATCH request with updated content', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEditedComment)
        })

        const { editComment } = await import('../../src/api/comments')
        await editComment('comment-1', 'Updated text', true)

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/kpuppy/comments/comment-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ text: 'Updated text', spoiler: true })
          })
        )
      })

      it('returns updated comment', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEditedComment)
        })

        const { editComment } = await import('../../src/api/comments')
        const result = await editComment('comment-1', 'Updated text', true)

        expect(result.text).toBe('Updated text')
        expect(result.spoiler).toBe(true)
      })
    })

    describe('deleteComment', () => {
      it('sends DELETE request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'deleted' })
        })

        const { deleteComment } = await import('../../src/api/comments')
        await deleteComment('comment-1')

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/kpuppy/comments/comment-1',
          expect.objectContaining({
            method: 'DELETE'
          })
        )
      })

      it('does not throw on success', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'deleted' })
        })

        const { deleteComment } = await import('../../src/api/comments')
        await expect(deleteComment('comment-1')).resolves.toBeUndefined()
      })
    })

    describe('provisionUser', () => {
      it('sends POST request with userHash and avatar', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ userId: 'new-user-id' })
        })

        const { provisionUser } = await import('../../src/api/comments')
        await provisionUser('testuser', 'https://example.com/avatar.jpg')

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/kpuppy/users/provision',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ userHash: 'testuser', avatar: 'https://example.com/avatar.jpg' })
          })
        )
      })

      it('extracts userId from response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ userId: 'new-user-id' })
        })

        const { provisionUser } = await import('../../src/api/comments')
        const result = await provisionUser('testuser')

        expect(result.userId).toBe('new-user-id')
      })
    })

    describe('isCommentsApiAvailable', () => {
      it('returns true when API URL is configured', async () => {
        const { isCommentsApiAvailable } = await import('../../src/api/comments')
        expect(isCommentsApiAvailable()).toBe(true)
      })
    })

    describe('error handling', () => {
      it('includes error code from API response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: () => Promise.resolve({ error: 'user_banned', message: 'User is banned' })
        })

        const { getComments, CommentsApiError } = await import('../../src/api/comments')

        try {
          await getComments(123)
        } catch (err) {
          expect((err as InstanceType<typeof CommentsApiError>).code).toBe('user_banned')
          expect((err as InstanceType<typeof CommentsApiError>).status).toBe(403)
        }
      })

      it('handles non-JSON error responses', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.reject(new Error('Not JSON'))
        })

        const { getComments, CommentsApiError } = await import('../../src/api/comments')

        try {
          await getComments(123)
        } catch (err) {
          expect((err as InstanceType<typeof CommentsApiError>).message).toBe('Request failed: Internal Server Error')
        }
      })
    })
  })

  describe('without API configured', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_COMMENTS_API_URL', '')
    })

    it('getComments returns empty response', async () => {
      const { getComments } = await import('../../src/api/comments')
      const result = await getComments(123)

      expect(result.comments).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('createComment throws error', async () => {
      const { createComment } = await import('../../src/api/comments')
      await expect(createComment(123, 'Test', false)).rejects.toThrow('Comments API not configured')
    })

    it('isCommentsApiAvailable returns false', async () => {
      const { isCommentsApiAvailable } = await import('../../src/api/comments')
      expect(isCommentsApiAvailable()).toBe(false)
    })
  })
})
