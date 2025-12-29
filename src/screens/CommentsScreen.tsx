import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks'
import { getComments, createComment, replyToComment, isCommentsApiAvailable, Comment, CommentsApiError } from '../api/comments'
import { Keyboard, KEYBOARD_ROWS, handleSpecialKey } from '../components/Keyboard'
import { useKeyboardNavigation } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/comments.css'

interface CommentsScreenProps {
  itemId: number
  itemTitle: string
  onBack: () => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type FocusArea = 'comments' | 'writeButton' | 'keyboard' | 'spoilerToggle' | 'sendButton' | 'retry' | 'loadMore'

export function CommentsScreen({ itemId, itemTitle, onBack, onNavigateToMenu, isActive }: CommentsScreenProps) {
  const { t } = useI18n()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [focusArea, setFocusArea] = useState<FocusArea>('comments')
  const [commentFocusIndex, setCommentFocusIndex] = useState(0)
  const [expandedSpoilers, setExpandedSpoilers] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [composing, setComposing] = useState(false)
  const [composedText, setComposedText] = useState('')
  const [spoilerFlag, setSpoilerFlag] = useState(false)
  const [keyboardRow, setKeyboardRow] = useState(0)
  const [keyboardCol, setKeyboardCol] = useState(0)
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const flatComments = useMemo(() => {
    const result: { comment: Comment; isReply: boolean }[] = []
    for (const comment of comments) {
      result.push({ comment, isReply: false })
      if (comment.replies) {
        for (const reply of comment.replies) {
          result.push({ comment: reply, isReply: true })
        }
      }
    }
    return result
  }, [comments])

  const loadComments = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!isCommentsApiAvailable()) {
      setLoading(false)
      setError(null)
      return
    }

    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }

      const response = await getComments(itemId, pageNum)

      if (append) {
        setComments(prev => [...prev, ...response.comments])
      } else {
        setComments(response.comments)
      }
      setPage(pageNum)
      setHasMore(response.pagination.hasMore)
    } catch (err) {
      if (err instanceof CommentsApiError) {
        setError(err.message)
      } else {
        setError(t.commentsError)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [itemId, t.commentsError])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleKeyPress = useCallback((key: string) => {
    const result = handleSpecialKey(key, composedText)
    if (result.text !== composedText) {
      setComposedText(result.text)
    }
  }, [composedText])

  const handleSendComment = useCallback(async () => {
    if (!composedText.trim() || sending) return

    setSending(true)
    try {
      let newComment: Comment
      if (replyingTo) {
        newComment = await replyToComment(replyingTo.id, composedText.trim(), spoilerFlag)
        setComments(prev => prev.map(c => {
          if (c.id === replyingTo.id) {
            return { ...c, replies: [...(c.replies || []), newComment] }
          }
          return c
        }))
      } else {
        newComment = await createComment(itemId, composedText.trim(), spoilerFlag)
        setComments(prev => [newComment, ...prev])
      }

      setComposedText('')
      setSpoilerFlag(false)
      setReplyingTo(null)
      setComposing(false)
      setFocusArea('comments')
      setCommentFocusIndex(0)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to send comment:', err)
    } finally {
      setSending(false)
    }
  }, [composedText, spoilerFlag, replyingTo, itemId, sending])

  const toggleSpoiler = useCallback((commentId: string) => {
    setExpandedSpoilers(prev => {
      const next = new Set(prev)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }, [])

  const startReply = useCallback((comment: Comment) => {
    setReplyingTo(comment)
    setComposing(true)
    setComposedText('')
    setSpoilerFlag(false)
    setFocusArea('keyboard')
    setKeyboardRow(0)
    setKeyboardCol(0)
  }, [])

  const handlers = useMemo(() => {
    const cols = KEYBOARD_ROWS[keyboardRow]?.length || 12

    if (focusArea === 'retry') {
      return {
        onBack,
        onEnter: () => loadComments(),
        onLeft: onNavigateToMenu
      }
    }

    if (focusArea === 'loadMore') {
      return {
        onBack,
        onUp: () => {
          if (flatComments.length > 0) {
            setFocusArea('comments')
            setCommentFocusIndex(flatComments.length - 1)
          }
        },
        onEnter: () => loadComments(page + 1, true),
        onLeft: onNavigateToMenu
      }
    }

    if (composing) {
      if (focusArea === 'keyboard') {
        return {
          onBack: () => {
            if (composedText) {
              setComposedText(prev => prev.slice(0, -1))
            } else {
              setComposing(false)
              setReplyingTo(null)
              setFocusArea('writeButton')
            }
          },
          onLeft: () => {
            if (keyboardCol === 0) {
              onNavigateToMenu()
            } else {
              setKeyboardCol(prev => prev - 1)
            }
          },
          onRight: () => setKeyboardCol(prev => (prev < cols - 1 ? prev + 1 : 0)),
          onUp: () => {
            if (keyboardRow > 0) {
              setKeyboardRow(prev => prev - 1)
              setKeyboardCol(prev => Math.min(prev, KEYBOARD_ROWS[keyboardRow - 1].length - 1))
            } else {
              setFocusArea('spoilerToggle')
            }
          },
          onDown: () => {
            if (keyboardRow < KEYBOARD_ROWS.length - 1) {
              setKeyboardRow(prev => prev + 1)
              setKeyboardCol(prev => Math.min(prev, KEYBOARD_ROWS[keyboardRow + 1].length - 1))
            }
          },
          onEnter: () => {
            const key = KEYBOARD_ROWS[keyboardRow]?.[keyboardCol]
            if (key) {
              handleKeyPress(key)
            }
          }
        }
      }

      if (focusArea === 'spoilerToggle') {
        return {
          onBack: () => {
            setComposing(false)
            setReplyingTo(null)
            setFocusArea('writeButton')
          },
          onDown: () => {
            setFocusArea('keyboard')
            setKeyboardRow(0)
          },
          onRight: () => setFocusArea('sendButton'),
          onEnter: () => setSpoilerFlag(prev => !prev),
          onLeft: onNavigateToMenu
        }
      }

      if (focusArea === 'sendButton') {
        return {
          onBack: () => {
            setComposing(false)
            setReplyingTo(null)
            setFocusArea('writeButton')
          },
          onDown: () => {
            setFocusArea('keyboard')
            setKeyboardRow(0)
          },
          onLeft: () => setFocusArea('spoilerToggle'),
          onEnter: handleSendComment
        }
      }
    }

    if (focusArea === 'comments') {
      return {
        onBack,
        onLeft: () => {
          if (commentFocusIndex === 0) {
            onNavigateToMenu()
          }
        },
        onUp: () => {
          if (commentFocusIndex > 0) {
            setCommentFocusIndex(prev => prev - 1)
          }
        },
        onDown: () => {
          if (commentFocusIndex < flatComments.length - 1) {
            setCommentFocusIndex(prev => prev + 1)
          } else if (hasMore) {
            setFocusArea('loadMore')
          } else {
            setFocusArea('writeButton')
          }
        },
        onEnter: () => {
          const item = flatComments[commentFocusIndex]
          if (item) {
            if (item.comment.spoiler && !expandedSpoilers.has(item.comment.id)) {
              toggleSpoiler(item.comment.id)
            } else {
              startReply(item.comment)
            }
          }
        },
        onGreen: () => {
          const item = flatComments[commentFocusIndex]
          if (item) {
            startReply(item.comment)
          }
        }
      }
    }

    if (focusArea === 'writeButton') {
      return {
        onBack,
        onUp: () => {
          if (hasMore) {
            setFocusArea('loadMore')
          } else if (flatComments.length > 0) {
            setFocusArea('comments')
            setCommentFocusIndex(flatComments.length - 1)
          }
        },
        onEnter: () => {
          setComposing(true)
          setReplyingTo(null)
          setFocusArea('keyboard')
          setKeyboardRow(0)
          setKeyboardCol(0)
        },
        onLeft: onNavigateToMenu
      }
    }

    return { onBack }
  }, [
    focusArea, composing, keyboardRow, keyboardCol, flatComments,
    commentFocusIndex, hasMore, expandedSpoilers, onBack, onNavigateToMenu,
    handleKeyPress, handleSendComment, toggleSpoiler, startReply, loadComments,
    page, composedText
  ])

  useKeyboardNavigation(handlers, isActive)

  useEffect(() => {
    if (focusArea === 'comments' && flatComments.length > 0 && listRef.current) {
      const commentEl = listRef.current.querySelector(`[data-comment-index="${commentFocusIndex}"]`) as HTMLElement
      if (commentEl) {
        const containerRect = listRef.current.getBoundingClientRect()
        const elRect = commentEl.getBoundingClientRect()
        if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
          commentEl.scrollIntoView({ block: 'nearest' })
        }
      }
    }
  }, [commentFocusIndex, focusArea, flatComments.length])

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString()
  }

  const getUserInitial = (username: string): string => {
    return username.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <div class="comments-screen">
        <div class="comments-header">
          <h1 class="comments-header-title">{itemTitle}</h1>
          <p class="comments-header-subtitle">{t.comments}</p>
        </div>
        <div class="comments-loading">
          <div class="comments-spinner" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div class="comments-screen">
        <div class="comments-header">
          <h1 class="comments-header-title">{itemTitle}</h1>
          <p class="comments-header-subtitle">{t.comments}</p>
        </div>
        <div class="comments-error">
          <span class="comments-error-text">{error}</span>
          <button class={`comments-error-retry ${focusArea === 'retry' ? 'focused' : ''}`}>
            {t.retry}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div class="comments-screen">
      <div class="comments-header">
        <h1 class="comments-header-title">{itemTitle}</h1>
        <p class="comments-header-subtitle">{t.comments}</p>
      </div>

      <div class="comments-content">
        <div class="comments-list" ref={listRef}>
          {flatComments.length === 0 && !isCommentsApiAvailable() && (
            <div class="comments-empty">{t.noComments}</div>
          )}
          {flatComments.length === 0 && isCommentsApiAvailable() && (
            <div class="comments-empty">{t.noComments}</div>
          )}

          {flatComments.map(({ comment, isReply }, index) => {
            const isFocused = focusArea === 'comments' && commentFocusIndex === index
            const isSpoilerHidden = comment.spoiler && !expandedSpoilers.has(comment.id)

            return (
              <div
                key={comment.id}
                data-comment-index={index}
                class={`comments-item ${isFocused ? 'focused' : ''} ${isReply ? 'reply' : ''}`}
              >
                <div class="comments-item-header">
                  {comment.user.avatar ? (
                    <img class="comments-item-avatar" src={comment.user.avatar} alt="" />
                  ) : (
                    <div class="comments-item-avatar-placeholder">
                      {getUserInitial(comment.user.username)}
                    </div>
                  )}
                  <div class="comments-item-info">
                    <div class="comments-item-username">{comment.user.username}</div>
                    <div class="comments-item-time">{formatTime(comment.createdAt)}</div>
                  </div>
                </div>
                {isSpoilerHidden ? (
                  <div class={`comments-item-spoiler ${isFocused ? 'focused' : ''}`}>
                    <span class="comments-item-spoiler-text">{t.showSpoiler}</span>
                  </div>
                ) : (
                  <div class="comments-item-text">{comment.text}</div>
                )}
              </div>
            )
          })}

          {hasMore && (
            <div class="comments-load-more">
              {loadingMore ? (
                <div class="comments-spinner" style={{ width: 32, height: 32 }} />
              ) : (
                <button class={`comments-load-more-button ${focusArea === 'loadMore' ? 'focused' : ''}`}>
                  {t.loadingMore}
                </button>
              )}
            </div>
          )}
        </div>

        <div class="comments-write-section">
          {!composing ? (
            <button class={`comments-write-button ${focusArea === 'writeButton' ? 'focused' : ''}`}>
              {t.writeComment}
            </button>
          ) : (
            <div class="comments-compose">
              {replyingTo && (
                <div class="comments-compose-replying">
                  {t.replyingTo} <strong>{replyingTo.user.username}</strong>
                </div>
              )}
              <div class="comments-input">
                <span class="comments-input-text">{composedText}</span>
                <span class="comments-input-cursor" />
              </div>

              <div class="comments-compose-options">
                <button class={`comments-spoiler-toggle ${spoilerFlag ? 'active' : ''} ${focusArea === 'spoilerToggle' ? 'focused' : ''}`}>
                  <span class="comments-spoiler-checkbox" />
                  {t.markAsSpoiler}
                </button>
                <button
                  class={`comments-send-button ${focusArea === 'sendButton' ? 'focused' : ''}`}
                  disabled={!composedText.trim() || sending}
                >
                  {t.sendComment}
                </button>
              </div>

              <Keyboard
                rows={KEYBOARD_ROWS}
                focusedRow={keyboardRow}
                focusedCol={keyboardCol}
                isFocused={focusArea === 'keyboard'}
                onKeyPress={handleKeyPress}
                className="comments-keyboard"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
