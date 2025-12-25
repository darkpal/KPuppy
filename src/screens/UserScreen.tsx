import { useState, useEffect, useMemo } from 'preact/hooks'
import { getUser, User } from '../api/kinopub'
import { useKeyboardNavigation } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/user.css'

interface UserScreenProps {
  onNavigateToMenu: () => void
  onLogout: () => void
  isActive: boolean
}

export function UserScreen({ onNavigateToMenu, onLogout, isActive }: UserScreenProps) {
  const { t, language } = useI18n()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getUser()
        setUser(userData)
      } catch (err) {
        console.error('Failed to load user:', err)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const handlers = useMemo(() => ({
    onLeft: onNavigateToMenu,
    onUp: () => setFocusedIndex(0),
    onDown: () => setFocusedIndex(0),
    onEnter: () => {
      if (focusedIndex === 0) {
        onLogout()
      }
    }
  }), [focusedIndex, onNavigateToMenu, onLogout])

  useKeyboardNavigation(handlers, isActive)

  const formatSubscriptionDate = (timestamp: number): string => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp * 1000)
    const locale = language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : 'en-US'
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div class="user-screen">
        <h1 class="user-title">{t.profile}</h1>
        <div class="user-loading">
          <div class="user-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div class="user-screen">
      <h1 class="user-title">{t.profile}</h1>

      <div class="user-card">
        <div class="user-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} class="user-avatar-image" />
          ) : (
            <div class="user-avatar-placeholder">
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        <div class="user-info">
          <h2 class="user-username">{user?.username || 'Unknown'}</h2>

          <div class="user-subscription">
            <div class="user-subscription-status">
              <span class="user-subscription-label">{t.subscription}</span>
              <span class={`user-subscription-badge ${user?.subscription?.active ? 'active' : 'inactive'}`}>
                {user?.subscription?.active ? t.subscriptionActive : t.subscriptionInactive}
              </span>
            </div>

            {user?.subscription?.active && (
              <>
                <div class="user-subscription-row">
                  <span class="user-subscription-label">{t.expires}</span>
                  <span class="user-subscription-value">
                    {formatSubscriptionDate(user.subscription.endTime)}
                  </span>
                </div>
                <div class="user-subscription-row">
                  <span class="user-subscription-label">{t.daysLeft}</span>
                  <span class="user-subscription-value">
                    {user.subscription.days}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div class="user-actions">
        <button
          class={`user-logout-button ${focusedIndex === 0 ? 'focused' : ''}`}
          onClick={onLogout}
        >
          {t.logout}
        </button>
      </div>
    </div>
  )
}
