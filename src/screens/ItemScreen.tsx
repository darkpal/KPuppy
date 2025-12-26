import { useEffect, useCallback, useMemo, useReducer } from 'preact/hooks'
import { getItem, getSimilarItems, getBookmarkFolders, addToBookmark, toggleWatchlist, isItemInWatchlist, ItemDetails as ItemDetailsType, MovieItem, VideoFile, BookmarkFolder } from '../api/kinopub'
import { getLocalSettings } from '../storage'
import { useKeyboardNavigation } from '../hooks'
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
  onNavigateToMenu: () => void
  isActive: boolean
}

type FocusArea = 'play' | 'watching' | 'watchlist' | 'trailer' | 'seasons' | 'qualitySelect' | 'similar'

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
  watchlistLoading: boolean
  showFolderDialog: boolean
  folders: BookmarkFolder[]
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
  | { type: 'SET_FOLDER_FOCUS_INDEX'; index: number }
  | { type: 'OPEN_FOLDER_DIALOG'; folders: BookmarkFolder[] }
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
  watchlistLoading: false,
  showFolderDialog: false,
  folders: [],
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
    case 'SET_FOLDER_FOCUS_INDEX':
      return { ...state, folderFocusIndex: action.index }
    case 'OPEN_FOLDER_DIALOG':
      return { ...state, showFolderDialog: true, folders: action.folders, folderFocusIndex: 0, watchlistLoading: false }
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

export function ItemScreen({ itemId, onBack, onPlay, onPlayTrailer, onSelectSeries, onSelectItem, onNavigateToMenu, isActive }: ItemScreenProps) {
  const { t } = useI18n()
  const [state, dispatch] = useReducer(itemScreenReducer, initialState)
  const { item, loading, error, focusArea, selectedQuality, dropdownFocusIndex, similarItems, similarFocusIndex, watchlistLoading, showFolderDialog, folders, folderFocusIndex, isWatching, watchingToggleLoading } = state

  useEffect(() => {
    async function loadItem() {
      try {
        dispatch({ type: 'LOAD_START' })
        const data = await getItem(itemId)

        const hasSeries = data.seasons && data.seasons.length > 0
        const newFocusArea: FocusArea = hasSeries ? 'seasons' : 'play'

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
      const folderList = await getBookmarkFolders()
      dispatch({ type: 'OPEN_FOLDER_DIALOG', folders: folderList })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to load folders:', err)
      dispatch({ type: 'SET_WATCHLIST_LOADING', value: false })
    }
  }, [watchlistLoading])

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

  const handleAddToFolder = useCallback(async () => {
    const folder = folders[folderFocusIndex]
    if (!folder || watchlistLoading) return
    dispatch({ type: 'SET_WATCHLIST_LOADING', value: true })
    try {
      await addToBookmark(itemId, folder.id)
      dispatch({ type: 'CLOSE_FOLDER_DIALOG' })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to add to folder:', err)
      dispatch({ type: 'SET_WATCHLIST_LOADING', value: false })
    }
  }, [folders, folderFocusIndex, itemId, watchlistLoading])

  const handlers = useMemo(() => {
    const hasSeries = item?.seasons && item.seasons.length > 0
    const hasSimilar = similarItems.length > 0
    const hasTrailer = !!item?.trailer?.url
    const primaryButton: FocusArea = hasSeries ? 'seasons' : 'play'

    if (showFolderDialog) {
      return {
        onBack: () => dispatch({ type: 'CLOSE_FOLDER_DIALOG' }),
        onUp: () => dispatch({ type: 'SET_FOLDER_FOCUS_INDEX', index: Math.max(0, folderFocusIndex - 1) }),
        onDown: () => dispatch({ type: 'SET_FOLDER_FOCUS_INDEX', index: Math.min(folders.length - 1, folderFocusIndex + 1) }),
        onEnter: handleAddToFolder
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
        onUp: () => dispatch({ type: 'SET_FOCUS_AREA', area: primaryButton }),
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
        if (hasSimilar) {
          dispatch({ type: 'SET_FOCUS_AREA', area: 'similar' })
          dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index: 0 })
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
        } else if (focusArea === 'watchlist' && hasTrailer) {
          dispatch({ type: 'SET_FOCUS_AREA', area: 'trailer' })
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
            <ItemDetails
              countries={countries}
              directors={directors}
              actors={actors}
              audios={audios}
              subtitles={subtitles}
            />
          </div>

          <SimilarItems
            items={similarItems}
            focusedIndex={similarFocusIndex}
            isFocused={focusArea === 'similar'}
            onSelectItem={onSelectItem}
          />
        </div>
      </div>

    </div>

    {showFolderDialog && (
      <FolderDialog
        folders={folders}
        focusedIndex={folderFocusIndex}
        onSelect={(index: number) => dispatch({ type: 'SET_FOLDER_FOCUS_INDEX', index })}
        onConfirm={handleAddToFolder}
      />
    )}
    </>
  )
}
