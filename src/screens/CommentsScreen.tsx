import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks'
import { getComments, createComment, replyToComment, editComment, deleteComment, isCommentsApiAvailable, Comment, CommentsApiError } from '../api/comments'
import { getCommentsUserId } from '../storage'
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

type FocusArea = 'comments' | 'writeButton' | 'keyboard' | 'spoilerToggle' | 'sendButton' | 'retry' | 'confirmDelete'

export function CommentsScreen({ itemId, itemTitle, onBack, onNavigateToMenu, isActive }: CommentsScreenProps) {
  const { t } = useI18n()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [focusArea, setFocusArea] = useState<FocusArea>('comments')
  const [commentFocusIndex, setCommentFocusIndex] = useState(0)
  const [expandedSpoilers, setExpandedSpoilers] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [editingComment, setEditingComment] = useState<Comment | null>(null)
  const [deletingComment, setDeletingComment] = useState<Comment | null>(null)
  const [composing, setComposing] = useState(false)
  const [composedText, setComposedText] = useState('')
  const [spoilerFlag, setSpoilerFlag] = useState(false)
  const [keyboardRow, setKeyboardRow] = useState(0)
  const [keyboardCol, setKeyboardCol] = useState(0)
  const [sending, setSending] = useState(false)
  const [confirmDeleteFocus, setConfirmDeleteFocus] = useState<'yes' | 'no'>('no')
  const listRef = useRef<HTMLDivElement>(null)
  const currentUserId = getCommentsUserId()

  const flatComments = useMemo(() => {
    const result: { comment: Comment; depth: number }[] = []
    const flatten = (commentList: Comment[], depth: number) => {
      for (const comment of commentList) {
        result.push({ comment, depth })
        if (comment.replies && comment.replies.length > 0) {
          flatten(comment.replies, depth + 1)
        }
      }
    }
    flatten(comments, 0)
    return result
  }, [comments])

  const loadComments = useCallback(async () => {
    if (!isCommentsApiAvailable()) {
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await getComments(itemId)
      setComments(response.comments)
    } catch (err) {
      if (err instanceof CommentsApiError) {
        setError(err.message)
      } else {
        setError(t.commentsError)
      }
    } finally {
      setLoading(false)
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

  const addReplyToComment = useCallback((commentList: Comment[], parentId: string, reply: Comment): Comment[] => {
    return commentList.map(c => {
      if (c.id === parentId) {
        return { ...c, replies: [...(c.replies || []), reply] }
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: addReplyToComment(c.replies, parentId, reply) }
      }
      return c
    })
  }, [])

  const updateCommentInTree = useCallback((commentList: Comment[], commentId: string, updatedComment: Comment): Comment[] => {
    return commentList.map(c => {
      if (c.id === commentId) {
        return { ...updatedComment, replies: c.replies }
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: updateCommentInTree(c.replies, commentId, updatedComment) }
      }
      return c
    })
  }, [])

  const markCommentAsDeleted = useCallback((commentList: Comment[], commentId: string): Comment[] => {
    return commentList.map(c => {
      if (c.id === commentId) {
        return { ...c, text: '[deleted]' }
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: markCommentAsDeleted(c.replies, commentId) }
      }
      return c
    })
  }, [])

  const handleSendComment = useCallback(async () => {
    if (!composedText.trim() || sending) return

    setSending(true)
    try {
      let resultComment: Comment
      if (editingComment) {
        resultComment = await editComment(editingComment.id, composedText.trim(), spoilerFlag)
        setComments(prev => updateCommentInTree(prev, editingComment.id, resultComment))
        setEditingComment(null)
      } else if (replyingTo) {
        resultComment = await replyToComment(replyingTo.id, composedText.trim(), spoilerFlag)
        setComments(prev => addReplyToComment(prev, replyingTo.id, resultComment))
      } else {
        resultComment = await createComment(itemId, composedText.trim(), spoilerFlag)
        setComments(prev => [resultComment, ...prev])
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
  }, [composedText, spoilerFlag, replyingTo, editingComment, itemId, sending, addReplyToComment, updateCommentInTree])

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
    setEditingComment(null)
    setComposing(true)
    setComposedText('')
    setSpoilerFlag(false)
    setFocusArea('keyboard')
    setKeyboardRow(0)
    setKeyboardCol(0)
  }, [])

  const startEdit = useCallback((comment: Comment) => {
    setEditingComment(comment)
    setReplyingTo(null)
    setComposing(true)
    setComposedText(comment.text)
    setSpoilerFlag(comment.spoiler)
    setFocusArea('keyboard')
    setKeyboardRow(0)
    setKeyboardCol(0)
  }, [])

  const handleDeleteComment = useCallback(async () => {
    if (!deletingComment || sending) return

    setSending(true)
    try {
      await deleteComment(deletingComment.id)
      setComments(prev => markCommentAsDeleted(prev, deletingComment.id))
      setDeletingComment(null)
      setFocusArea('comments')
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to delete comment:', err)
    } finally {
      setSending(false)
    }
  }, [deletingComment, sending, markCommentAsDeleted])

  const handlers = useMemo(() => {
    const cols = KEYBOARD_ROWS[keyboardRow]?.length || 12

    if (focusArea === 'retry') {
      return {
        onBack,
        onEnter: () => loadComments(),
        onLeft: onNavigateToMenu
      }
    }

    if (focusArea === 'confirmDelete') {
      return {
        onBack: () => {
          setDeletingComment(null)
          setFocusArea('comments')
        },
        onLeft: () => setConfirmDeleteFocus('no'),
        onRight: () => setConfirmDeleteFocus('yes'),
        onEnter: () => {
          if (confirmDeleteFocus === 'yes') {
            handleDeleteComment()
          } else {
            setDeletingComment(null)
            setFocusArea('comments')
          }
        }
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
              setEditingComment(null)
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
            setEditingComment(null)
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
            setEditingComment(null)
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
      const focusedItem = flatComments[commentFocusIndex]
      const isOwnComment = focusedItem && currentUserId && focusedItem.comment.userId === currentUserId
      const isDeleted = focusedItem && focusedItem.comment.text === '[deleted]'

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
          } else {
            setFocusArea('writeButton')
          }
        },
        onEnter: () => {
          if (focusedItem) {
            if (focusedItem.comment.spoiler && !expandedSpoilers.has(focusedItem.comment.id)) {
              toggleSpoiler(focusedItem.comment.id)
            } else {
              startReply(focusedItem.comment)
            }
          }
        },
        onGreen: () => {
          if (focusedItem) {
            startReply(focusedItem.comment)
          }
        },
        onBlue: () => {
          if (isOwnComment && !isDeleted) {
            startEdit(focusedItem.comment)
          }
        },
        onRed: () => {
          if (isOwnComment && !isDeleted) {
            setDeletingComment(focusedItem.comment)
            setConfirmDeleteFocus('no')
            setFocusArea('confirmDelete')
          }
        }
      }
    }

    if (focusArea === 'writeButton') {
      return {
        onBack,
        onUp: () => {
          if (flatComments.length > 0) {
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
    commentFocusIndex, expandedSpoilers, onBack, onNavigateToMenu,
    handleKeyPress, handleSendComment, toggleSpoiler, startReply, startEdit,
    loadComments, composedText, currentUserId, confirmDeleteFocus, handleDeleteComment
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
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

          {flatComments.map(({ comment, depth }, index) => {
            const isFocused = focusArea === 'comments' && commentFocusIndex === index
            const isSpoilerHidden = comment.spoiler && !expandedSpoilers.has(comment.id)
            const indentStyle = depth > 0 ? { marginLeft: `${Math.min(depth, 4) * 24}px` } : undefined
            const isOwnComment = currentUserId && comment.userId === currentUserId
            const isDeleted = comment.text === '[deleted]'

            return (
              <div
                key={comment.id}
                data-comment-index={index}
                class={`comments-item ${isFocused ? 'focused' : ''} ${depth > 0 ? 'reply' : ''} ${isOwnComment ? 'own' : ''}`}
                style={indentStyle}
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
                  {isFocused && isOwnComment && !isDeleted && (
                    <div class="comments-item-actions">
                      <span class="comments-action-hint blue">{t.editComment}</span>
                      <span class="comments-action-hint red">{t.deleteComment}</span>
                    </div>
                  )}
                </div>
                {isSpoilerHidden ? (
                  <div class={`comments-item-spoiler ${isFocused ? 'focused' : ''}`}>
                    <span class="comments-item-spoiler-text">{t.showSpoiler}</span>
                  </div>
                ) : (
                  <div class={`comments-item-text ${isDeleted ? 'deleted' : ''}`}>{comment.text}</div>
                )}
              </div>
            )
          })}
        </div>

        <div class="comments-write-section">
          {!composing ? (
            <button class={`comments-write-button ${focusArea === 'writeButton' ? 'focused' : ''}`}>
              {t.writeComment}
            </button>
          ) : (
            <div class="comments-compose">
              {editingComment && (
                <div class="comments-compose-editing">
                  {t.editing}
                </div>
              )}
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

      {deletingComment && (
        <div class="comments-delete-overlay">
          <div class="comments-delete-dialog">
            <p class="comments-delete-message">{t.confirmDeleteComment}</p>
            <div class="comments-delete-buttons">
              <button class={`comments-delete-btn cancel ${confirmDeleteFocus === 'no' ? 'focused' : ''}`}>
                {t.cancel}
              </button>
              <button class={`comments-delete-btn confirm ${confirmDeleteFocus === 'yes' ? 'focused' : ''}`}>
                {t.deleteComment}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
