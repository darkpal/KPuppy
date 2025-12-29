import { getTokens } from '../storage'

const COMMENTS_BASE_URL = import.meta.env.VITE_COMMENTS_API_URL || ''

export class CommentsApiError extends Error {
  constructor(message: string, public status: number) {
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
  user: CommentUser
  text: string
  spoiler: boolean
  parentId: string | null
  createdAt: number
  replies?: Comment[]
}

export interface CommentsResponse {
  comments: Comment[]
  pagination: {
    page: number
    totalPages: number
    totalItems: number
    hasMore: boolean
  }
}

export interface UserProvisionResponse {
  userId: string
}

async function commentsAuthFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const tokens = getTokens()
  if (!tokens) {
    throw new CommentsApiError('Not authenticated', 401)
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${tokens.access}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  }

  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    throw new CommentsApiError(`Request failed: ${response.statusText}`, response.status)
  }

  return response
}

export async function getComments(kinopubItemId: number, page: number = 1): Promise<CommentsResponse> {
  if (!COMMENTS_BASE_URL) {
    return { comments: [], pagination: { page: 1, totalPages: 0, totalItems: 0, hasMore: false } }
  }

  try {
    const response = await commentsAuthFetch(
      `${COMMENTS_BASE_URL}/content/${kinopubItemId}/comments?page=${page}&perPage=20`
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
    const response = await commentsAuthFetch(
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
    const response = await commentsAuthFetch(
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

export async function provisionUser(
  username: string,
  avatar?: string
): Promise<UserProvisionResponse> {
  if (!COMMENTS_BASE_URL) {
    throw new CommentsApiError('Comments API not configured', 503)
  }

  try {
    const response = await commentsAuthFetch(
      `${COMMENTS_BASE_URL}/users/provision`,
      {
        method: 'POST',
        body: JSON.stringify({ username, avatar })
      }
    )
    return await response.json()
  } catch (err) {
    if (import.meta.env.DEV) console.error('provisionUser failed:', err)
    throw err
  }
}

export function isCommentsApiAvailable(): boolean {
  return !!COMMENTS_BASE_URL
}
