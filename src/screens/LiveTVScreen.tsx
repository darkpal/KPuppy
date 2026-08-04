import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks'
import { getTVChannels, TVChannel } from '../api/kinopub'
import { useKeyboardNavigation, useScrollToFocused, createGridNavigationHandlers } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/livetv.css'

interface LiveTVScreenProps {
  onNavigateToMenu: () => void
  onPlayChannel: (url: string, title: string) => void
  isActive: boolean
  initialFocusIndex?: number
  onFocusChange?: (index: number) => void
}

export function LiveTVScreen({ onNavigateToMenu, onPlayChannel, isActive, initialFocusIndex = 0, onFocusChange }: LiveTVScreenProps) {
  const { t } = useI18n()
  const [channels, setChannels] = useState<TVChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadChannels() {
      setLoading(true)
      try {
        const data = await getTVChannels()
        setChannels(data)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load TV channels:', err)
      } finally {
        setLoading(false)
      }
    }
    loadChannels()
  }, [])

  useEffect(() => {
    onFocusChange?.(focusedIndex)
  }, [focusedIndex])

  const handlePlayChannel = useCallback((channel: TVChannel, index: number) => {
    if (!channel.url) return
    setFocusedIndex(index)
    onPlayChannel(channel.url, channel.title)
  }, [onPlayChannel])

  const handlers = useMemo(() => ({
    ...createGridNavigationHandlers({
      itemCount: channels.length,
      itemsPerRow: 4,
      focusedIndex,
      setFocusedIndex,
      onSelect: (index) => {
        const channel = channels[index]
        if (channel) {
          handlePlayChannel(channel, index)
        }
      },
      onLeftEdge: onNavigateToMenu
    }),
    onBack: onNavigateToMenu
  }), [channels, focusedIndex, onNavigateToMenu, handlePlayChannel])

  useKeyboardNavigation(handlers, isActive && !loading)

  useScrollToFocused({
    containerRef,
    focusedIndex,
    itemSelector: '[data-channel-index]',
    itemCount: channels.length,
    enabled: isActive && !loading
  })

  if (loading) {
    return (
      <div class="livetv-screen">
        <h1 class="livetv-title">{t.menuLiveTV}</h1>
        <LoadingState />
      </div>
    )
  }

  return (
    <div class="livetv-screen" ref={containerRef}>
      <h1 class="livetv-title">{t.menuLiveTV}</h1>
      <div class="livetv-grid">
        {channels.map((channel, index) => (
          <div
            key={channel.id}
            data-channel-index={index}
            class={`livetv-card ${focusedIndex === index ? 'focused' : ''}`}
            onMouseEnter={() => setFocusedIndex(index)}
            onClick={() => handlePlayChannel(channel, index)}
          >
            {channel.logo ? (
              <img src={channel.logo} alt={channel.title} class="livetv-logo" />
            ) : (
              <div class="livetv-logo-placeholder">
                <span>{channel.title.charAt(0)}</span>
              </div>
            )}
            <span class="livetv-name">{channel.title}</span>
          </div>
        ))}
      </div>
      {channels.length === 0 && (
        <div class="livetv-empty">{t.errorNoItems}</div>
      )}
    </div>
  )
}
