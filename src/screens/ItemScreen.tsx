import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { getItem, getSimilarItems, getBookmarkFolders, addToBookmark, toggleWatchlist, isItemInWatchlist, ItemDetails, MovieItem, VideoFile, Audio, Subtitle, BookmarkFolder } from '../api/kinopub'
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
  onPlayTrailer: (url: string, title: string) => void
  onSelectSeries: (seriesId: number) => void
  onSelectItem: (itemId: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type FocusArea = 'play' | 'watching' | 'watchlist' | 'trailer' | 'seasons' | 'qualitySelect' | 'similar'

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

export function ItemScreen({ itemId, onBack, onPlay, onPlayTrailer, onSelectSeries, onSelectItem, onNavigateToMenu, isActive }: ItemScreenProps) {
  const { t } = useI18n()
  const [item, setItem] = useState<ItemDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [focusArea, setFocusArea] = useState<FocusArea>('play')
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null)
  const [dropdownFocusIndex, setDropdownFocusIndex] = useState(0)
  const [similarItems, setSimilarItems] = useState<MovieItem[]>([])
  const [similarFocusIndex, setSimilarFocusIndex] = useState(0)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folders, setFolders] = useState<BookmarkFolder[]>([])
  const [folderFocusIndex, setFolderFocusIndex] = useState(0)
  const [isWatching, setIsWatching] = useState(false)
  const [watchingToggleLoading, setWatchingToggleLoading] = useState(false)

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true)
        setError(null)
        setIsWatching(false)
        const data = await getItem(itemId)
        setItem(data)

        const hasSeries = data.seasons && data.seasons.length > 0
        setFocusArea(hasSeries ? 'seasons' : 'play')

        const files = data.videos?.[0]?.files || data.seasons?.[0]?.episodes?.[0]?.files
        const available = getAvailableQualities(files)
        const { defaultQuality } = getLocalSettings()

        if (defaultQuality !== 'auto' && available.includes(defaultQuality)) {
          setSelectedQuality(defaultQuality)
        } else if (available.length > 0) {
          setSelectedQuality(available[0])
        }

        getSimilarItems(itemId).then(setSimilarItems).catch(() => {})

        if (hasSeries) {
          isItemInWatchlist(itemId).then(setIsWatching).catch(() => {})
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

  const handleOpenFolderDialog = useCallback(async () => {
    if (watchlistLoading) return
    setWatchlistLoading(true)
    try {
      const folderList = await getBookmarkFolders()
      setFolders(folderList)
      setFolderFocusIndex(0)
      setShowFolderDialog(true)
    } catch (err) {
      console.error('Failed to load folders:', err)
    } finally {
      setWatchlistLoading(false)
    }
  }, [watchlistLoading])

  const handleToggleWatching = useCallback(async () => {
    if (watchingToggleLoading) return
    setWatchingToggleLoading(true)
    try {
      await toggleWatchlist(itemId)
      setIsWatching(prev => !prev)
    } catch (err) {
      console.error('Failed to toggle watching:', err)
    } finally {
      setWatchingToggleLoading(false)
    }
  }, [itemId, watchingToggleLoading])

  const handleAddToFolder = useCallback(async () => {
    const folder = folders[folderFocusIndex]
    if (!folder || watchlistLoading) return
    setWatchlistLoading(true)
    try {
      await addToBookmark(itemId, folder.id)
      setShowFolderDialog(false)
    } catch (err) {
      console.error('Failed to add to folder:', err)
    } finally {
      setWatchlistLoading(false)
    }
  }, [folders, folderFocusIndex, itemId, watchlistLoading])

  const handlers = useMemo(() => {
    const hasSeries = item?.seasons && item.seasons.length > 0
    const hasSimilar = similarItems.length > 0
    const hasTrailer = !!item?.trailer?.url
    const primaryButton = hasSeries ? 'seasons' : 'play'

    if (showFolderDialog) {
      return {
        onBack: () => setShowFolderDialog(false),
        onUp: () => setFolderFocusIndex(prev => Math.max(0, prev - 1)),
        onDown: () => setFolderFocusIndex(prev => Math.min(folders.length - 1, prev + 1)),
        onEnter: handleAddToFolder
      }
    }

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

    if (focusArea === 'similar') {
      return {
        onBack,
        onLeft: () => {
          if (similarFocusIndex > 0) {
            setSimilarFocusIndex(prev => prev - 1)
          } else {
            onNavigateToMenu()
          }
        },
        onRight: () => setSimilarFocusIndex(prev => Math.min(similarItems.length - 1, prev + 1)),
        onUp: () => setFocusArea(primaryButton),
        onEnter: () => {
          const selectedItem = similarItems[similarFocusIndex]
          if (selectedItem) {
            onSelectItem(selectedItem.id)
          }
        }
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
      onDown: () => {
        if (hasSimilar) {
          setFocusArea('similar')
          setSimilarFocusIndex(0)
        }
      },
      onLeft: () => {
        if (focusArea === 'trailer') {
          setFocusArea('watchlist')
        } else if (focusArea === 'watchlist') {
          setFocusArea(hasSeries ? 'watching' : primaryButton)
        } else if (focusArea === 'watching') {
          setFocusArea(primaryButton)
        } else if (focusArea === 'play' || focusArea === 'seasons') {
          onNavigateToMenu()
        }
      },
      onRight: () => {
        if (focusArea === 'play' || focusArea === 'seasons') {
          setFocusArea(hasSeries ? 'watching' : 'watchlist')
        } else if (focusArea === 'watching') {
          setFocusArea('watchlist')
        } else if (focusArea === 'watchlist' && hasTrailer) {
          setFocusArea('trailer')
        }
      },
      onEnter: () => {
        if (focusArea === 'watching') {
          handleToggleWatching()
        } else if (focusArea === 'watchlist') {
          handleOpenFolderDialog()
        } else if (focusArea === 'trailer' && item?.trailer?.url) {
          onPlayTrailer(item.trailer.url, `${item.title} - ${t.trailer}`)
        } else {
          handlePlayOrSelect()
        }
      },
      onYellow: handleOpenFolderDialog
    }
  }, [item, focusArea, availableQualities, dropdownFocusIndex, selectedQuality, onBack, onNavigateToMenu, handlePlayOrSelect, handleOpenFolderDialog, handleAddToFolder, handleToggleWatching, similarItems, similarFocusIndex, onSelectItem, showFolderDialog, folders, folderFocusIndex, onPlayTrailer, t])

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
    <>
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

          <div class="item-two-columns">
            <div class="item-column-left">
              {item.plot && <p class="item-plot">{item.plot}</p>}

              <div class="item-actions">
                {hasSeasons ? (
                  <button
                    class={`item-button item-button-primary ${focusArea === 'seasons' ? 'focused' : ''}`}
                  >
                    <span class="item-button-icon">≡</span>
                    {t.seasons} ({item.seasons!.length})
                  </button>
                ) : (
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
                )}
                {hasSeasons && (
                  <button
                    class={`item-button item-button-secondary ${focusArea === 'watching' ? 'focused' : ''}`}
                    disabled={watchingToggleLoading}
                  >
                    <span class="item-button-icon">{isWatching ? '−' : '+'}</span>
                    {isWatching ? t.removeFromWatchlist : t.addToWatchlist}
                  </button>
                )}
                <button
                  class={`item-button item-button-secondary ${focusArea === 'watchlist' ? 'focused' : ''}`}
                  disabled={watchlistLoading}
                >
                  <span class="item-button-icon">★</span>
                  {t.addToBookmarks}
                </button>
                {item?.trailer?.url && (
                  <button
                    class={`item-button item-button-secondary ${focusArea === 'trailer' ? 'focused' : ''}`}
                  >
                    <span class="item-button-icon">▷</span>
                    {t.trailer}
                  </button>
                )}
              </div>
            </div>
            <div class="item-column-right">
              {countries && (
                <p class="item-detail">
                  <span class="item-detail-label">{t.country}:</span>
                  <span class="item-detail-value">{countries}</span>
                </p>
              )}
              {directors && (
                <p class="item-detail">
                  <span class="item-detail-label">{t.director}:</span>
                  <span class="item-detail-value">{directors}</span>
                </p>
              )}
              {actors && (
                <p class="item-detail">
                  <span class="item-detail-label">{t.cast}:</span>
                  <span class="item-detail-value">{actors}</span>
                </p>
              )}
              {audios.length > 0 && (
                <p class="item-detail">
                  <span class="item-detail-label">{t.audio}:</span>
                  <span class="item-detail-value">
                    {audios.map((audio, idx) => (
                      <span key={audio.id}>
                        {formatAudioLabel(audio)}
                        {idx < audios.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                </p>
              )}
              {subtitles.length > 0 && (
                <p class="item-detail">
                  <span class="item-detail-label">{t.subtitles}:</span>
                  <span class="item-detail-value">
                    {subtitles.map((sub, idx) => (
                      <span key={sub.lang}>
                        {formatSubtitleLabel(sub)}
                        {idx < subtitles.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                </p>
              )}
            </div>
          </div>

          {similarItems.length > 0 && (
            <div class={`item-similar ${focusArea === 'similar' ? 'active' : ''}`}>
              <h3 class="item-similar-title">{t.similar}</h3>
              <div class="item-similar-row">
                {similarItems.slice(0, 8).map((similar, idx) => (
                  <div
                    key={similar.id}
                    class={`item-similar-card ${focusArea === 'similar' && similarFocusIndex === idx ? 'focused' : ''}`}
                    onClick={() => onSelectItem(similar.id)}
                  >
                    {similar.posters?.medium || similar.posters?.small ? (
                      <img
                        src={similar.posters.medium || similar.posters.small}
                        alt={similar.title}
                        class="item-similar-poster"
                      />
                    ) : (
                      <div class="item-similar-poster item-similar-poster-placeholder" />
                    )}
                    <div class="item-similar-info">
                      <span class="item-similar-name">{similar.title}</span>
                      <span class="item-similar-year">{similar.year}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>

    {showFolderDialog && (
      <div class="item-folder-dialog-overlay">
        <div class="item-folder-dialog">
          <h2>{t.addToBookmarks}</h2>
          <div class="item-folder-list">
            {folders.map((folder, idx) => (
              <div
                key={folder.id}
                class={`item-folder-option ${folderFocusIndex === idx ? 'focused' : ''}`}
                onClick={() => {
                  setFolderFocusIndex(idx)
                  handleAddToFolder()
                }}
              >
                <span class="item-folder-name">{folder.title}</span>
                <span class="item-folder-count">{folder.count}</span>
              </div>
            ))}
          </div>
          {folders.length === 0 && (
            <p class="item-folder-empty">{t.errorNoItems}</p>
          )}
        </div>
      </div>
    )}
    </>
  )
}
