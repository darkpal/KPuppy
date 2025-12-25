import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { getItem, ItemDetails, VideoFile, Audio, Subtitle } from '../api/kinopub'
import { getLocalSettings } from '../storage'
import { useKeyboardNavigation } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/item.css'

interface PlayOptions {
  quality?: string
}

interface ItemScreenProps {
  itemId: number
  onBack: () => void
  onPlay: (itemId: number, season?: number, episode?: number, options?: PlayOptions) => void
  onSelectSeries: (seriesId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type FocusArea = 'play' | 'seasons' | 'qualitySelect'

const QUALITY_ORDER = ['2160p', '1080p', '720p', '480p']

function getAvailableQualities(files?: VideoFile[]): string[] {
  if (!files) return []
  return files.map(f => f.quality).filter(q => QUALITY_ORDER.includes(q))
}

function formatAudioLabel(audio: Audio): string {
  const parts: string[] = []
  if (audio.type) {
    parts.push(audio.type.short_title || audio.type.title)
  }
  if (audio.author?.title) {
    parts.push(audio.author.title)
  }
  if (audio.channels === 6) {
    parts.push('5.1')
  }
  return parts.join(' • ') || 'Audio'
}

function formatSubtitleLabel(sub: Subtitle): string {
  const langNames: Record<string, string> = {
    rus: 'Русский',
    eng: 'English',
    ukr: 'Українська',
    spa: 'Español',
    por: 'Português',
    deu: 'Deutsch',
    fra: 'Français',
  }
  return langNames[sub.lang] || sub.lang.toUpperCase()
}

export function ItemScreen({ itemId, onBack, onPlay, onSelectSeries, onNavigateToMenu, isActive }: ItemScreenProps) {
  const { t } = useI18n()
  const [item, setItem] = useState<ItemDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [focusArea, setFocusArea] = useState<FocusArea>('play')
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null)
  const [dropdownFocusIndex, setDropdownFocusIndex] = useState(0)

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true)
        setError(null)
        const data = await getItem(itemId)
        setItem(data)

        const files = data.videos?.[0]?.files || data.seasons?.[0]?.episodes?.[0]?.files
        const available = getAvailableQualities(files)
        const { defaultQuality } = getLocalSettings()

        if (defaultQuality !== 'auto' && available.includes(defaultQuality)) {
          setSelectedQuality(defaultQuality)
        } else if (available.length > 0) {
          setSelectedQuality(available[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    loadItem()
  }, [itemId])

  const videoData = item?.videos?.[0] || item?.seasons?.[0]?.episodes?.[0]
  const files = videoData?.files
  const audios = videoData?.audios || []
  const subtitles = videoData?.subtitles || []
  const availableQualities = getAvailableQualities(files)

  const handlePlayOrSelect = useCallback(() => {
    if (!item) return
    const hasSeries = item.seasons && item.seasons.length > 0

    if (focusArea === 'play') {
      const options: PlayOptions = {
        quality: selectedQuality || undefined
      }
      if (hasSeries) {
        const season = item.seasons![0]
        onPlay(itemId, season.number, season.episodes[0]?.number || 1, options)
      } else {
        onPlay(itemId, undefined, undefined, options)
      }
    } else if (focusArea === 'seasons') {
      onSelectSeries(itemId)
    }
  }, [item, focusArea, itemId, onPlay, onSelectSeries, selectedQuality])

  const handlers = useMemo(() => {
    const hasSeries = item?.seasons && item.seasons.length > 0

    if (focusArea === 'qualitySelect') {
      const maxIndex = availableQualities.length - 1
      return {
        onUp: () => setDropdownFocusIndex(prev => Math.max(0, prev - 1)),
        onDown: () => setDropdownFocusIndex(prev => Math.min(maxIndex, prev + 1)),
        onEnter: () => {
          setSelectedQuality(availableQualities[dropdownFocusIndex])
          setFocusArea('play')
        },
        onBack: () => setFocusArea('play')
      }
    }

    return {
      onBack,
      onUp: () => {
        if (focusArea === 'play' && availableQualities.length > 1) {
          const currentIdx = availableQualities.indexOf(selectedQuality || '')
          setDropdownFocusIndex(Math.max(0, currentIdx))
          setFocusArea('qualitySelect')
        }
      },
      onLeft: () => {
        if (focusArea === 'seasons') {
          setFocusArea('play')
        } else {
          onNavigateToMenu()
        }
      },
      onRight: () => {
        if (focusArea === 'play' && hasSeries) {
          setFocusArea('seasons')
        }
      },
      onEnter: handlePlayOrSelect
    }
  }, [item, focusArea, availableQualities, dropdownFocusIndex, selectedQuality, onBack, onNavigateToMenu, handlePlayOrSelect])

  useKeyboardNavigation(handlers, isActive && !!item)

  if (loading) {
    return (
      <div class="item-screen">
        <div class="item-loading">
          <div class="item-spinner" />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div class="item-screen">
        <div class="item-loading">
          <span style={{ color: '#e50914' }}>{error || t.errorLoading}</span>
        </div>
      </div>
    )
  }

  const backdropUrl = item.posters?.big || item.posters?.medium
  const hasSeasons = item.seasons && item.seasons.length > 0
  const durationMinutes = item.duration?.average
    ? item.duration.average > 300
      ? Math.floor(item.duration.average / 60)
      : item.duration.average
    : null
  const duration = durationMinutes
    ? durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
      : `${durationMinutes}m`
    : null

  const kpRating = item.kinopoiskRating
  const imdbRating = item.imdbRating
  const directors = item.directors?.slice(0, 3).map(d => d.name).join(', ')
  const actors = item.actors?.slice(0, 6).map(a => a.name).join(', ')
  const countries = item.countries?.slice(0, 3).map(c => c.title).join(', ')

  return (
    <div class="item-screen">
      {backdropUrl && (
        <div
          class="item-backdrop"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
      )}

      <div class="item-content">
        <div class="item-header">
          <h1 class="item-title">{item.title}</h1>

          <div class="item-meta">
            <span class="item-year">{item.year}</span>
            {kpRating > 0 && (
              <span class="item-rating item-rating-kp">
                KP {kpRating.toFixed(1)}
              </span>
            )}
            {imdbRating > 0 && (
              <span class="item-rating item-rating-imdb">
                IMDb {imdbRating.toFixed(1)}
              </span>
            )}
            {duration && <span class="item-duration">{duration}</span>}
            <span class="item-type">{item.type}</span>
          </div>

          {item.genres && item.genres.length > 0 && (
            <div class="item-genres">
              {item.genres.slice(0, 5).map(genre => (
                <span key={genre.id} class="item-genre">{genre.title}</span>
              ))}
            </div>
          )}

          {item.plot && <p class="item-plot">{item.plot}</p>}

          <div class="item-details">
            {countries && (
              <p class="item-detail">
                <span class="item-detail-label">{t.country}: </span>
                {countries}
              </p>
            )}
            {directors && (
              <p class="item-detail">
                <span class="item-detail-label">{t.director}: </span>
                {directors}
              </p>
            )}
            {actors && (
              <p class="item-detail">
                <span class="item-detail-label">{t.cast}: </span>
                {actors}
              </p>
            )}
          </div>

          <div class="item-actions">
            <div class="item-play-container">
              <button
                class={`item-button item-button-primary ${focusArea === 'play' || focusArea === 'qualitySelect' ? 'focused' : ''}`}
              >
                <span class="item-button-icon">▶</span>
                {t.play}
                {selectedQuality && (
                  <span class="item-quality-badge">{selectedQuality}</span>
                )}
                {availableQualities.length > 1 && (
                  <span class="item-quality-hint">▲</span>
                )}
              </button>
              {focusArea === 'qualitySelect' && (
                <div class="item-dropdown item-dropdown-quality">
                  {availableQualities.map((q, idx) => (
                    <div
                      key={q}
                      class={`item-dropdown-option ${dropdownFocusIndex === idx ? 'focused' : ''} ${selectedQuality === q ? 'selected' : ''}`}
                    >
                      {q}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {hasSeasons && (
              <button
                class={`item-button item-button-secondary ${focusArea === 'seasons' ? 'focused' : ''}`}
              >
                <span class="item-button-icon">☰</span>
                {t.seasons} ({item.seasons!.length})
              </button>
            )}
          </div>

          {(audios.length > 0 || subtitles.length > 0) && (
            <div class="item-media-info">
              {audios.length > 0 && (
                <div class="item-media-section">
                  <span class="item-media-label">{t.audio}:</span>
                  <span class="item-media-list">
                    {audios.map((audio, idx) => (
                      <span key={audio.id} class="item-media-item">
                        {formatAudioLabel(audio)}
                        {idx < audios.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {subtitles.length > 0 && (
                <div class="item-media-section">
                  <span class="item-media-label">{t.subtitles}:</span>
                  <span class="item-media-list">
                    {subtitles.map((sub, idx) => (
                      <span key={sub.lang} class="item-media-item">
                        {formatSubtitleLabel(sub)}
                        {idx < subtitles.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
