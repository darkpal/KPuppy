import { getCommentsUserId } from '../storage'

const COMMENTS_BASE_URL = import.meta.env.VITE_COMMENTS_API_URL || ''

export class CommentsApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'CommentsApiError'
  }
}

export interface CommentUser {
  id: string
  username: string
  avatar?: string
}

export interface Comment {
  id: string
  contentId: string
  userId: string
  text: string
  spoiler: boolean
  user: CommentUser
  parentId: string | null
  createdAt: number
  replies?: Comment[]
}

export interface CommentsResponse {
  comments: Comment[]
}

export interface UserProvisionResponse {
  userId: string
}

interface ApiErrorResponse {
  error: string
  message: string
}

async function commentsApiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const userId = getCommentsUserId()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  }

  if (userId) {
    headers['X-User-ID'] = userId
  }

  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.statusText}`
    let errorCode: string | undefined

    try {
      const errorData: ApiErrorResponse = await response.json()
      errorMessage = errorData.message || errorMessage
      errorCode = errorData.error
    } catch {
    }

    throw new CommentsApiError(errorMessage, response.status, errorCode)
  }

  return response
}

export async function getComments(kinopubItemId: number): Promise<CommentsResponse> {
  if (!COMMENTS_BASE_URL) {
    return { comments: [] }
  }

  try {
    const response = await commentsApiFetch(
      `${COMMENTS_BASE_URL}/content/${kinopubItemId}/comments`
    )
    return await response.json()
  } catch (err) {
    if (import.meta.env.DEV) console.error('getComments failed:', err)
    throw err
  }
}

export async function createComment(
  kinopubItemId: number,
  text: string,
  spoiler: boolean
): Promise<Comment> {
  if (!COMMENTS_BASE_URL) {
    throw new CommentsApiError('Comments API not configured', 503)
  }

  try {
    const response = await commentsApiFetch(
      `${COMMENTS_BASE_URL}/content/${kinopubItemId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ text, spoiler })
      }
    )
    return await response.json()
  } catch (err) {
    if (import.meta.env.DEV) console.error('createComment failed:', err)
    throw err
  }
}

export async function replyToComment(
  commentId: string,
  text: string,
  spoiler: boolean
): Promise<Comment> {
  if (!COMMENTS_BASE_URL) {
    throw new CommentsApiError('Comments API not configured', 503)
  }

  try {
    const response = await commentsApiFetch(
      `${COMMENTS_BASE_URL}/comments/${commentId}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({ text, spoiler })
      }
    )
    return await response.json()
  } catch (err) {
    if (import.meta.env.DEV) console.error('replyToComment failed:', err)
    throw err
  }
}

export async function editComment(
  commentId: string,
  text: string,
  spoiler: boolean
): Promise<Comment> {
  if (!COMMENTS_BASE_URL) {
    throw new CommentsApiError('Comments API not configured', 503)
  }

  try {
    const response = await commentsApiFetch(
      `${COMMENTS_BASE_URL}/comments/${commentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ text, spoiler })
      }
    )
    return await response.json()
  } catch (err) {
    if (import.meta.env.DEV) console.error('editComment failed:', err)
    throw err
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  if (!COMMENTS_BASE_URL) {
    throw new CommentsApiError('Comments API not configured', 503)
  }

  try {
    await commentsApiFetch(
      `${COMMENTS_BASE_URL}/comments/${commentId}`,
      { method: 'DELETE' }
    )
  } catch (err) {
    if (import.meta.env.DEV) console.error('deleteComment failed:', err)
    throw err
  }
}

export async function provisionUser(
  username: string,
  avatar?: string
): Promise<UserProvisionResponse> {
  if (!COMMENTS_BASE_URL) {
    throw new CommentsApiError('Comments API not configured', 503)
  }

  try {
    const response = await commentsApiFetch(
      `${COMMENTS_BASE_URL}/users/provision`,
      {
        method: 'POST',
        body: JSON.stringify({ username, avatar: avatar || undefined })
      }
    )
    const data = await response.json()
    if (import.meta.env.DEV) console.log('provisionUser response:', data)
    const userId = data.userId || data.id
    if (!userId) {
      throw new CommentsApiError('Invalid provision response: missing userId', 500)
    }
    return { userId }
  } catch (err) {
    if (import.meta.env.DEV) console.error('provisionUser failed:', err)
    throw err
  }
}

export function isCommentsApiAvailable(): boolean {
  return !!COMMENTS_BASE_URL
}
