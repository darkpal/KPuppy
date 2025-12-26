import { useState, useEffect, useMemo, useCallback } from 'preact/hooks'
import { getTVChannels, TVChannel } from '../api/kinopub'
import { useKeyboardNavigation } from '../hooks'
import { useI18n } from '../i18n'
import { launchNativePlayer } from '../webos/player'
import '../styles/livetv.css'

interface LiveTVScreenProps {
  onNavigateToMenu: () => void
  onBeforePlay: () => void
  isActive: boolean
  initialFocusIndex?: number
  onFocusChange?: (index: number) => void
}

export function LiveTVScreen({ onNavigateToMenu, onBeforePlay, isActive, initialFocusIndex = 0, onFocusChange }: LiveTVScreenProps) {
  const { t } = useI18n()
  const [channels, setChannels] = useState<TVChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex)

  useEffect(() => {
    async function loadChannels() {
      setLoading(true)
      try {
        const data = await getTVChannels()
        setChannels(data)
      } catch (err) {
        console.error('Failed to load TV channels:', err)
      } finally {
        setLoading(false)
      }
    }
    loadChannels()
  }, [])

  useEffect(() => {
    onFocusChange?.(focusedIndex)
  }, [focusedIndex])

  const handlePlayChannel = useCallback(async (channel: TVChannel) => {
    if (!channel.url) return
    onBeforePlay()
    try {
      await launchNativePlayer({
        fullPath: channel.url,
        fileName: channel.title,
        thumbnail: channel.logo
      })
    } catch (err) {
      console.error('Failed to play channel:', err)
    }
  }, [onBeforePlay])

  const handlers = useMemo(() => {
    const channelCount = channels.length
    const itemsPerRow = 4

    return {
      onLeft: () => {
        if (focusedIndex % itemsPerRow === 0) {
          onNavigateToMenu()
        } else {
          setFocusedIndex(prev => Math.max(0, prev - 1))
        }
      },
      onRight: () => setFocusedIndex(prev => Math.min(channelCount - 1, prev + 1)),
      onUp: () => setFocusedIndex(prev => Math.max(0, prev - itemsPerRow)),
      onDown: () => {
        const newIndex = focusedIndex + itemsPerRow
        if (newIndex < channelCount) {
          setFocusedIndex(newIndex)
        }
      },
      onEnter: () => {
        const channel = channels[focusedIndex]
        if (channel) {
          handlePlayChannel(channel)
        }
      }
    }
  }, [channels, focusedIndex, onNavigateToMenu, handlePlayChannel])

  useKeyboardNavigation(handlers, isActive && !loading)

  useEffect(() => {
    const focusedEl = document.querySelector(`[data-channel-index="${focusedIndex}"]`) as HTMLElement
    const container = document.querySelector('.livetv-screen') as HTMLElement
    if (focusedEl && container) {
      const elTop = focusedEl.offsetTop
      const containerHeight = container.clientHeight
      const elHeight = focusedEl.clientHeight
      const targetScroll = elTop - (containerHeight / 2) + (elHeight / 2)
      container.scrollTop = Math.max(0, targetScroll)
    }
  }, [focusedIndex])

  if (loading) {
    return (
      <div class="livetv-screen">
        <h1 class="livetv-title">{t.menuLiveTV}</h1>
        <div class="livetv-loading">
          <div class="livetv-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div class="livetv-screen">
      <h1 class="livetv-title">{t.menuLiveTV}</h1>
      <div class="livetv-grid">
        {channels.map((channel, index) => (
          <div
            key={channel.id}
            data-channel-index={index}
            class={`livetv-card ${focusedIndex === index ? 'focused' : ''}`}
            onClick={() => handlePlayChannel(channel)}
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
