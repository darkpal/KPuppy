import { useEffect, useCallback, useMemo, useReducer } from 'preact/hooks'
import { getItem, getMediaLinks, getSimilarItems, getBookmarkFolders, getItemFolders, addToBookmark, removeFromBookmark, toggleWatchlist, isItemInWatchlist, ItemDetails as ItemDetailsType, MovieItem, VideoFile, BookmarkFolder } from '../api/kinopub'
import { getLocalSettings } from '../storage'
import { useKeyboardNavigation } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import { ItemDetails } from '../components/ItemDetails'
import { SimilarItems } from '../components/SimilarItems'
import { FolderDialog } from '../components/FolderDialog'
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
  onSelectGenre?: (genreId: number, itemType: string) => void
  onSelectActor?: (name: string) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type FocusArea = 'play' | 'watching' | 'watchlist' | 'trailer' | 'seasons' | 'qualitySelect' | 'genres' | 'cast' | 'similar'

const QUALITY_ORDER = ['2160p', '1080p', '720p', '480p']

function getAvailableQualities(files?: VideoFile[]): string[] {
  if (!files) return []
  return files.map(f => f.quality).filter(q => QUALITY_ORDER.includes(q))
}

interface ItemScreenState {
  item: ItemDetailsType | null
  loading: boolean
  error: string | null
  focusArea: FocusArea
  selectedQuality: string | null
  dropdownFocusIndex: number
  similarItems: MovieItem[]
  similarFocusIndex: number
  metaFocusIndex: number
  watchlistLoading: boolean
  showFolderDialog: boolean
  folders: BookmarkFolder[]
  itemFolderIds: number[]
  folderFocusIndex: number
  isWatching: boolean
  watchingToggleLoading: boolean
}

type ItemScreenAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; item: ItemDetailsType; focusArea: FocusArea; selectedQuality: string | null }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SET_SIMILAR_ITEMS'; items: MovieItem[] }
  | { type: 'SET_IS_WATCHING'; value: boolean }
  | { type: 'SET_FOCUS_AREA'; area: FocusArea }
  | { type: 'SET_SELECTED_QUALITY'; quality: string }
  | { type: 'SET_DROPDOWN_FOCUS_INDEX'; index: number }
  | { type: 'SET_SIMILAR_FOCUS_INDEX'; index: number }
  | { type: 'SET_META_FOCUS_INDEX'; index: number }
  | { type: 'SET_FOLDER_FOCUS_INDEX'; index: number }
  | { type: 'OPEN_FOLDER_DIALOG'; folders: BookmarkFolder[]; itemFolderIds: number[] }
  | { type: 'SET_FOLDER_STATE'; folders: BookmarkFolder[]; itemFolderIds: number[] }
  | { type: 'CLOSE_FOLDER_DIALOG' }
  | { type: 'SET_WATCHLIST_LOADING'; value: boolean }
  | { type: 'SET_WATCHING_TOGGLE_LOADING'; value: boolean }
  | { type: 'TOGGLE_WATCHING' }

const initialState: ItemScreenState = {
  item: null,
  loading: true,
  error: null,
  focusArea: 'play',
  selectedQuality: null,
  dropdownFocusIndex: 0,
  similarItems: [],
  similarFocusIndex: 0,
  metaFocusIndex: 0,
  watchlistLoading: false,
  showFolderDialog: false,
  folders: [],
  itemFolderIds: [],
  folderFocusIndex: 0,
  isWatching: false,
  watchingToggleLoading: false,
}

function itemScreenReducer(state: ItemScreenState, action: ItemScreenAction): ItemScreenState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...initialState, loading: true }
    case 'LOAD_SUCCESS':
      return { ...state, loading: false, item: action.item, focusArea: action.focusArea, selectedQuality: action.selectedQuality }
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error }
    case 'SET_SIMILAR_ITEMS':
      return { ...state, similarItems: action.items }
    case 'SET_IS_WATCHING':
      return { ...state, isWatching: action.value }
    case 'SET_FOCUS_AREA':
      return { ...state, focusArea: action.area }
    case 'SET_SELECTED_QUALITY':
      return { ...state, selectedQuality: action.quality }
    case 'SET_DROPDOWN_FOCUS_INDEX':
      return { ...state, dropdownFocusIndex: action.index }
    case 'SET_SIMILAR_FOCUS_INDEX':
      return { ...state, similarFocusIndex: action.index }
    case 'SET_META_FOCUS_INDEX':
      return { ...state, metaFocusIndex: action.index }
    case 'SET_FOLDER_FOCUS_INDEX':
      return { ...state, folderFocusIndex: action.index }
    case 'OPEN_FOLDER_DIALOG':
      return { ...state, showFolderDialog: true, folders: action.folders, itemFolderIds: action.itemFolderIds, folderFocusIndex: 0, watchlistLoading: false }
    case 'SET_FOLDER_STATE':
      return { ...state, folders: action.folders, itemFolderIds: action.itemFolderIds, watchlistLoading: false }
    case 'CLOSE_FOLDER_DIALOG':
      return { ...state, showFolderDialog: false, watchlistLoading: false }
    case 'SET_WATCHLIST_LOADING':
      return { ...state, watchlistLoading: action.value }
    case 'SET_WATCHING_TOGGLE_LOADING':
      return { ...state, watchingToggleLoading: action.value }
    case 'TOGGLE_WATCHING':
      return { ...state, isWatching: !state.isWatching, watchingToggleLoading: false }
    default:
      return state
  }
}

export function ItemScreen({ itemId, onBack, onPlay, onPlayTrailer, onSelectSeries, onSelectItem, onSelectGenre, onSelectActor, onNavigateToMenu, isActive }: ItemScreenProps) {
  const { t } = useI18n()
  const [state, dispatch] = useReducer(itemScreenReducer, initialState)
  const { item, loading, error, focusArea, selectedQuality, dropdownFocusIndex, similarItems, similarFocusIndex, metaFocusIndex, watchlistLoading, showFolderDialog, folders, itemFolderIds, folderFocusIndex, isWatching, watchingToggleLoading } = state

  useEffect(() => {
    async function loadItem() {
      try {
        dispatch({ type: 'LOAD_START' })
        let data = await getItem(itemId)

        const hasSeries = data.seasons && data.seasons.length > 0
        const newFocusArea: FocusArea = hasSeries ? 'seasons' : 'play'

        // media-links returns the full subtitle/file set (item payload can be incomplete)
        const mediaId = data.videos?.[0]?.id || data.seasons?.[0]?.episodes?.[0]?.id
        if (mediaId) {
          try {
            const links = await getMediaLinks(mediaId)
            if (data.videos?.[0]) {
              data = {
                ...data,
                videos: [
                  {
                    ...data.videos[0],
                    files: links.files.length > 0 ? links.files : data.videos[0].files,
                    subtitles: links.subtitles.length > 0 ? links.subtitles : data.videos[0].subtitles
                  },
                  ...data.videos.slice(1)
                ]
              }
            } else if (data.seasons?.[0]?.episodes?.[0]) {
              const season0 = data.seasons[0]
              const ep0 = season0.episodes[0]
              data = {
                ...data,
                seasons: [
                  {
                    ...season0,
                    episodes: [
                      {
                        ...ep0,
                        files: links.files.length > 0 ? links.files : ep0.files,
                        subtitles: links.subtitles.length > 0 ? links.subtitles : ep0.subtitles
                      },
                      ...season0.episodes.slice(1)
                    ]
                  },
                  ...data.seasons.slice(1)
                ]
              }
            }
          } catch (err) {
            if (import.meta.env.DEV) console.error('getMediaLinks failed:', err)
          }
        }

        const files = data.videos?.[0]?.files || data.seasons?.[0]?.episodes?.[0]?.files
        const available = getAvailableQualities(files)
        const { defaultQuality } = getLocalSettings()

        let quality: string | null = null
        if (defaultQuality !== 'auto' && available.includes(defaultQuality)) {
          quality = defaultQuality
        } else if (available.length > 0) {
          quality = available[0]
        }

        dispatch({ type: 'LOAD_SUCCESS', item: data, focusArea: newFocusArea, selectedQuality: quality })

        getSimilarItems(itemId).then(items => dispatch({ type: 'SET_SIMILAR_ITEMS', items })).catch(err => {
          if (import.meta.env.DEV) console.error('getSimilarItems failed:', err)
        })

        if (hasSeries) {
          isItemInWatchlist(itemId).then(value => dispatch({ type: 'SET_IS_WATCHING', value })).catch(err => {
            if (import.meta.env.DEV) console.error('isItemInWatchlist failed:', err)
          })
        }
      } catch (err) {
        dispatch({ type: 'LOAD_ERROR', error: err instanceof Error ? err.message : 'Failed to load' })
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
    dispatch({ type: 'SET_WATCHLIST_LOADING', value: true })
    try {
      const [folderList, itemFolders] = await Promise.all([
        getBookmarkFolders(),
        getItemFolders(itemId).catch(() => [] as BookmarkFolder[])
      ])
      dispatch({ type: 'OPEN_FOLDER_DIALOG', folders: folderList, itemFolderIds: itemFolders.map(folder => folder.id) })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load folders:', err)
      dispatch({ type: 'SET_WATCHLIST_LOADING', value: false })
    }
  }, [watchlistLoading, itemId])

  const handleToggleWatching = useCallback(async () => {
    if (watchingToggleLoading) return
    dispatch({ type: 'SET_WATCHING_TOGGLE_LOADING', value: true })
    try {
      await toggleWatchlist(itemId)
      dispatch({ type: 'TOGGLE_WATCHING' })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to toggle watching:', err)
      dispatch({ type: 'SET_WATCHING_TOGGLE_LOADING', value: false })
    }
  }, [itemId, watchingToggleLoading])

  const handleToggleFolder = useCallback(async (index: number = folderFocusIndex) => {
    const folder = folders[index]
    if (!folder || watchlistLoading) return
    const isInFolder = itemFolderIds.includes(folder.id)
    dispatch({ type: 'SET_FOLDER_FOCUS_INDEX', index })
    dispatch({ type: 'SET_WATCHLIST_LOADING', value: true })
    try {
      if (isInFolder) {
        await removeFromBookmark(itemId, folder.id)
        dispatch({
          type: 'SET_FOLDER_STATE',
          folders: folders.map(f => f.id === folder.id ? { ...f, count: Math.max(0, f.count - 1) } : f),
          itemFolderIds: itemFolderIds.filter(id => id !== folder.id)
        })
      } else {
        await addToBookmark(itemId, folder.id)
        dispatch({
          type: 'SET_FOLDER_STATE',
          folders: folders.map(f => f.id === folder.id ? { ...f, count: f.count + 1 } : f),
          itemFolderIds: [...itemFolderIds, folder.id]
        })
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to toggle folder:', err)
      dispatch({ type: 'SET_WATCHLIST_LOADING', value: false })
    }
  }, [folders, folderFocusIndex, itemFolderIds, itemId, watchlistLoading])

  const genres = item?.genres?.slice(0, 8) || []
  const cast = item?.actors?.slice(0, 8) || []

  const handlers = useMemo(() => {
    const hasSeries = item?.seasons && item.seasons.length > 0
    const hasSimilar = similarItems.length > 0
    const hasTrailer = !!item?.trailer?.url
    const hasGenres = genres.length > 0
    const hasCast = cast.length > 0
    const primaryButton: FocusArea = hasSeries ? 'seasons' : 'play'

    const focusBelowActions = (): FocusArea => {
      if (hasGenres) return 'genres'
      if (hasCast) return 'cast'
      return 'similar'
    }

    if (showFolderDialog) {
      return {
        onBack: () => dispatch({ type: 'CLOSE_FOLDER_DIALOG' }),
        onUp: () => dispatch({ type: 'SET_FOLDER_FOCUS_INDEX', index: Math.max(0, folderFocusIndex - 1) }),
        onDown: () => dispatch({ type: 'SET_FOLDER_FOCUS_INDEX', index: Math.min(folders.length - 1, folderFocusIndex + 1) }),
        onEnter: () => { void handleToggleFolder() }
      }
    }

    if (focusArea === 'qualitySelect') {
      const maxIndex = availableQualities.length - 1
      return {
        onUp: () => dispatch({ type: 'SET_DROPDOWN_FOCUS_INDEX', index: Math.max(0, dropdownFocusIndex - 1) }),
        onDown: () => dispatch({ type: 'SET_DROPDOWN_FOCUS_INDEX', index: Math.min(maxIndex, dropdownFocusIndex + 1) }),
        onEnter: () => {
          dispatch({ type: 'SET_SELECTED_QUALITY', quality: availableQualities[dropdownFocusIndex] })
          dispatch({ type: 'SET_FOCUS_AREA', area: 'play' })
        },
        onBack: () => dispatch({ type: 'SET_FOCUS_AREA', area: 'play' })
      }
    }

    if (focusArea === 'genres') {
      return {
        onBack,
        onLeft: () => {
          if (metaFocusIndex > 0) {
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: metaFocusIndex - 1 })
          } else {
            onNavigateToMenu()
          }
        },
        onRight: () => dispatch({ type: 'SET_META_FOCUS_INDEX', index: Math.min(genres.length - 1, metaFocusIndex + 1) }),
        onUp: () => dispatch({ type: 'SET_FOCUS_AREA', area: primaryButton }),
        onDown: () => {
          if (hasCast) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'cast' })
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
          } else if (hasSimilar) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'similar' })
            dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index: 0 })
          }
        },
        onEnter: () => {
          const genre = genres[metaFocusIndex]
          if (genre && item) onSelectGenre?.(genre.id, item.type)
        }
      }
    }

    if (focusArea === 'cast') {
      return {
        onBack,
        onLeft: () => {
          if (metaFocusIndex > 0) {
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: metaFocusIndex - 1 })
          } else {
            onNavigateToMenu()
          }
        },
        onRight: () => dispatch({ type: 'SET_META_FOCUS_INDEX', index: Math.min(cast.length - 1, metaFocusIndex + 1) }),
        onUp: () => {
          if (hasGenres) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'genres' })
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
          } else {
            dispatch({ type: 'SET_FOCUS_AREA', area: primaryButton })
          }
        },
        onDown: () => {
          if (hasSimilar) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'similar' })
            dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index: 0 })
          }
        },
        onEnter: () => {
          const actor = cast[metaFocusIndex]
          if (actor) onSelectActor?.(actor.name)
        }
      }
    }

    if (focusArea === 'similar') {
      return {
        onBack,
        onLeft: () => {
          if (similarFocusIndex > 0) {
            dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index: similarFocusIndex - 1 })
          } else {
            onNavigateToMenu()
          }
        },
        onRight: () => dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index: Math.min(similarItems.length - 1, similarFocusIndex + 1) }),
        onUp: () => {
          if (hasCast) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'cast' })
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
          } else if (hasGenres) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'genres' })
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
          } else {
            dispatch({ type: 'SET_FOCUS_AREA', area: primaryButton })
          }
        },
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
          dispatch({ type: 'SET_DROPDOWN_FOCUS_INDEX', index: Math.max(0, currentIdx) })
          dispatch({ type: 'SET_FOCUS_AREA', area: 'qualitySelect' })
        }
      },
      onDown: () => {
        if (hasGenres || hasCast || hasSimilar) {
          const next = focusBelowActions()
          dispatch({ type: 'SET_FOCUS_AREA', area: next })
          if (next === 'similar') {
            dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index: 0 })
          } else {
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
          }
        }
      },
      onLeft: () => {
        if (focusArea === 'trailer') {
          dispatch({ type: 'SET_FOCUS_AREA', area: 'watchlist' })
        } else if (focusArea === 'watchlist') {
          dispatch({ type: 'SET_FOCUS_AREA', area: hasSeries ? 'watching' : primaryButton })
        } else if (focusArea === 'watching') {
          dispatch({ type: 'SET_FOCUS_AREA', area: primaryButton })
        } else if (focusArea === 'play' || focusArea === 'seasons') {
          onNavigateToMenu()
        }
      },
      onRight: () => {
        if (focusArea === 'play' || focusArea === 'seasons') {
          dispatch({ type: 'SET_FOCUS_AREA', area: hasSeries ? 'watching' : 'watchlist' })
        } else if (focusArea === 'watching') {
          dispatch({ type: 'SET_FOCUS_AREA', area: 'watchlist' })
        } else if (focusArea === 'watchlist') {
          if (hasTrailer) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'trailer' })
          }
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
  }, [item, focusArea, availableQualities, dropdownFocusIndex, selectedQuality, onBack, onNavigateToMenu, handlePlayOrSelect, handleOpenFolderDialog, handleToggleFolder, handleToggleWatching, similarItems, similarFocusIndex, metaFocusIndex, genres, cast, onSelectItem, onSelectGenre, onSelectActor, showFolderDialog, folders, folderFocusIndex, onPlayTrailer, t, itemId])

  useKeyboardNavigation(handlers, isActive && !!item)

  if (loading) {
    return (
      <div class="item-screen">
        <LoadingState />
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

          {genres.length > 0 && (
            <div class="item-genres">
              {genres.map((genre, index) => (
                <button
                  key={genre.id}
                  type="button"
                  class={`item-chip ${focusArea === 'genres' && metaFocusIndex === index ? 'focused' : ''}`}
                  onMouseEnter={() => {
                    dispatch({ type: 'SET_FOCUS_AREA', area: 'genres' })
                    dispatch({ type: 'SET_META_FOCUS_INDEX', index })
                  }}
                  onClick={() => onSelectGenre?.(genre.id, item.type)}
                >
                  {genre.title}
                </button>
              ))}
            </div>
          )}

          <div class="item-two-columns">
            <div class="item-column-left">
              {item.plot && <p class="item-plot">{item.plot}</p>}

              <div class="item-actions">
                {hasSeasons ? (
                  <button
                    type="button"
                    class={`item-button item-button-primary ${focusArea === 'seasons' ? 'focused' : ''}`}
                    onMouseEnter={() => dispatch({ type: 'SET_FOCUS_AREA', area: 'seasons' })}
                    onClick={handlePlayOrSelect}
                  >
                    <span class="item-button-icon">≡</span>
                    {t.seasons} ({item.seasons!.length})
                  </button>
                ) : (
                  <div class="item-play-container">
                    <button
                      type="button"
                      class={`item-button item-button-primary ${focusArea === 'play' || focusArea === 'qualitySelect' ? 'focused' : ''}`}
                      onMouseEnter={() => dispatch({ type: 'SET_FOCUS_AREA', area: 'play' })}
                      onClick={handlePlayOrSelect}
                    >
                      <span class="item-button-icon">▶</span>
                      {t.play}
                      {selectedQuality && (
                        <span class="item-quality-badge">{selectedQuality}</span>
                      )}
                      {availableQualities.length > 1 && (
                        <span
                          class="item-quality-hint"
                          onClick={(event) => {
                            event.stopPropagation()
                            const currentIdx = availableQualities.indexOf(selectedQuality || '')
                            dispatch({ type: 'SET_DROPDOWN_FOCUS_INDEX', index: Math.max(0, currentIdx) })
                            dispatch({ type: 'SET_FOCUS_AREA', area: 'qualitySelect' })
                          }}
                        >
                          ▲
                        </span>
                      )}
                    </button>
                    {focusArea === 'qualitySelect' && (
                      <div class="item-dropdown item-dropdown-quality">
                        {availableQualities.map((q, idx) => (
                          <div
                            key={q}
                            class={`item-dropdown-option ${dropdownFocusIndex === idx ? 'focused' : ''} ${selectedQuality === q ? 'selected' : ''}`}
                            onMouseEnter={() => dispatch({ type: 'SET_DROPDOWN_FOCUS_INDEX', index: idx })}
                            onClick={() => {
                              dispatch({ type: 'SET_SELECTED_QUALITY', quality: q })
                              dispatch({ type: 'SET_FOCUS_AREA', area: 'play' })
                            }}
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
                    type="button"
                    class={`item-button item-button-secondary ${focusArea === 'watching' ? 'focused' : ''}`}
                    disabled={watchingToggleLoading}
                    onMouseEnter={() => dispatch({ type: 'SET_FOCUS_AREA', area: 'watching' })}
                    onClick={handleToggleWatching}
                  >
                    <span class="item-button-icon">{isWatching ? '−' : '+'}</span>
                    {isWatching ? t.removeFromWatchlist : t.addToWatchlist}
                  </button>
                )}
                <button
                  type="button"
                  class={`item-button item-button-secondary ${focusArea === 'watchlist' ? 'focused' : ''}`}
                  disabled={watchlistLoading}
                  onMouseEnter={() => dispatch({ type: 'SET_FOCUS_AREA', area: 'watchlist' })}
                  onClick={handleOpenFolderDialog}
                >
                  <span class="item-button-icon">★</span>
                  {t.addToBookmarks}
                </button>
                {item?.trailer?.url && (
                  <button
                    type="button"
                    class={`item-button item-button-secondary ${focusArea === 'trailer' ? 'focused' : ''}`}
                    onMouseEnter={() => dispatch({ type: 'SET_FOCUS_AREA', area: 'trailer' })}
                    onClick={() => {
                      if (item.trailer?.url) {
                        onPlayTrailer(item.trailer.url, `${item.title} - ${t.trailer}`)
                      }
                    }}
                  >
                    <span class="item-button-icon">▷</span>
                    {t.trailer}
                  </button>
                )}
              </div>
            </div>
            <ItemDetails
              countries={countries}
              directors={directors}
              actors={cast}
              audios={audios}
              subtitles={subtitles}
              focusedActorIndex={focusArea === 'cast' ? metaFocusIndex : null}
              onHoverActor={(index) => {
                dispatch({ type: 'SET_FOCUS_AREA', area: 'cast' })
                dispatch({ type: 'SET_META_FOCUS_INDEX', index })
              }}
              onSelectActor={onSelectActor}
            />
          </div>

          <SimilarItems
            items={similarItems}
            focusedIndex={similarFocusIndex}
            isFocused={focusArea === 'similar'}
            onHoverItem={(index) => {
              dispatch({ type: 'SET_FOCUS_AREA', area: 'similar' })
              dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index })
            }}
            onSelectItem={onSelectItem}
          />
        </div>
      </div>

    </div>

    {showFolderDialog && (
      <FolderDialog
        folders={folders}
        bookmarkedFolderIds={itemFolderIds}
        focusedIndex={folderFocusIndex}
        onSelect={(index: number) => dispatch({ type: 'SET_FOLDER_FOCUS_INDEX', index })}
        onConfirm={handleToggleFolder}
      />
    )}
    </>
  )
}
