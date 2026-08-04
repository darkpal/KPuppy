import { useEffect, useCallback, useMemo, useReducer, useRef } from 'preact/hooks'
import { getItem, getMediaLinks, getSimilarItems, getBookmarkFolders, getItemFolders, addToBookmark, removeFromBookmark, toggleWatchlist, isItemInWatchlist, ItemDetails as ItemDetailsType, MovieItem, VideoFile, BookmarkFolder } from '../api/kinopub'
import { getLocalSettings } from '../storage'
import { useDecodedImage, useEventListener, useKeyboardNavigation, useWheelScroll, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { LoadingState, LoadingSpinner } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import { ItemDetails } from '../components/ItemDetails'
import { SimilarItems } from '../components/SimilarItems'
import { FolderDialog } from '../components/FolderDialog'
import thumbUpIcon from '../assets/thumb-up.svg'
import '../styles/item.css'

interface PlayOptions {
  quality?: string
}

interface ItemScreenProps {
  itemId: number
  preview?: MovieItem | null
  onBack: () => void
  onPlay: (itemId: number, season?: number, episode?: number, options?: PlayOptions) => void
  onPlayTrailer: (url: string, title: string) => void
  onSelectSeries: (seriesId: number) => void
  onSelectItem: (itemId: number, preview?: MovieItem) => void
  onSelectGenre?: (genreId: number, itemType: string) => void
  onSelectActor?: (name: string) => void
  onSelectDirector?: (name: string) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

type FocusArea = 'play' | 'watching' | 'watchlist' | 'trailer' | 'seasons' | 'qualitySelect' | 'genres' | 'details' | 'cast' | 'similar'

const QUALITY_ORDER = ['2160p', '1080p', '720p', '480p']

function getAvailableQualities(files?: VideoFile[]): string[] {
  if (!files) return []
  return files.map(f => f.quality).filter(q => QUALITY_ORDER.includes(q))
}

/** Draw the poster cover-cropped onto a screen-sized canvas (replaces
 * `object-fit: cover; object-position: center 18%` on the old <img>). */
function drawBannerCover(canvas: HTMLCanvasElement, image: HTMLImageElement): void {
  const width = canvas.clientWidth || 1920
  const height = canvas.clientHeight || 1080
  canvas.width = width
  canvas.height = height
  const iw = image.naturalWidth
  const ih = image.naturalHeight
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = canvas.getContext('2d')
  } catch {
    return
  }
  if (!ctx || !iw || !ih) return
  const scale = Math.max(width / iw, height / ih)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (iw - sourceWidth) / 2
  const sourceY = (ih - sourceHeight) * 0.18
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
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
  detailsExpanded: boolean
}

type ItemScreenAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; item: ItemDetailsType; focusArea: FocusArea; selectedQuality: string | null }
  | { type: 'UPDATE_MEDIA'; item: ItemDetailsType; selectedQuality: string | null }
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
  | { type: 'OPEN_DETAILS'; focusArea: FocusArea }
  | { type: 'CLOSE_DETAILS'; focusArea: FocusArea }

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
  detailsExpanded: false,
}

function itemScreenReducer(state: ItemScreenState, action: ItemScreenAction): ItemScreenState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...initialState, loading: true }
    case 'LOAD_SUCCESS':
      return { ...state, loading: false, item: action.item, focusArea: action.focusArea, selectedQuality: action.selectedQuality }
    case 'UPDATE_MEDIA':
      if (state.item?.id !== action.item.id) return state
      return {
        ...state,
        item: action.item,
        selectedQuality: state.selectedQuality || action.selectedQuality
      }
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
    case 'OPEN_DETAILS':
      return { ...state, detailsExpanded: true, focusArea: action.focusArea }
    case 'CLOSE_DETAILS':
      return { ...state, detailsExpanded: false, focusArea: action.focusArea }
    default:
      return state
  }
}

export function ItemScreen({ itemId, preview = null, onBack, onPlay, onPlayTrailer, onSelectSeries, onSelectItem, onSelectGenre, onSelectActor, onSelectDirector, onNavigateToMenu, isActive }: ItemScreenProps) {
  const { t } = useI18n()
  const [state, dispatch] = useReducer(itemScreenReducer, initialState)
  const { item, loading, error, focusArea, selectedQuality, dropdownFocusIndex, similarItems, similarFocusIndex, metaFocusIndex, watchlistLoading, showFolderDialog, folders, itemFolderIds, folderFocusIndex, isWatching, watchingToggleLoading, detailsExpanded } = state
  const detailsPageRef = useRef<HTMLElement>(null)
  const bannerCanvasRef = useRef<HTMLCanvasElement>(null)
  const similarCount = Math.min(similarItems.length, 12)
  const { itemsPerRow: similarPerRow, cardWidth: similarCardWidth } = useGridLayout(
    '.item-similar-grid',
    200,
    [similarCount, detailsExpanded]
  )
  // Landscape banner only — never use list medium/big (portrait) as full-bleed art.
  const posterUrl = (item?.posters?.wide || '').trim() || null
  const { image: bannerImage, ready: bannerReady } = useDecodedImage(posterUrl)

  // Downscale the poster to screen size: the webOS compositor stalls forever
  // (frozen frame until a key press) when asked to rasterize huge bitmaps.
  useEffect(() => {
    const canvas = bannerCanvasRef.current
    if (!canvas || !bannerImage) return
    drawBannerCover(canvas, bannerImage)
  }, [bannerImage])

  useEffect(() => {
    let cancelled = false
    let safetyTimer = 0

    async function loadItem() {
      try {
        dispatch({ type: 'LOAD_START' })
        // If getItem hangs without rejecting, unblock the spinner with an error.
        safetyTimer = window.setTimeout(() => {
          if (!cancelled) {
            dispatch({ type: 'LOAD_ERROR', error: t.errorLoading })
          }
        }, 25000)

        const data = await getItem(itemId)
        if (cancelled) return
        window.clearTimeout(safetyTimer)

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

        // The item payload is enough to render the card. Do not keep the whole
        // screen behind a spinner while the supplemental media request is slow.
        dispatch({ type: 'LOAD_SUCCESS', item: data, focusArea: newFocusArea, selectedQuality: quality })

        // media-links returns the full subtitle/file set (item payload can be incomplete)
        const mediaId = data.videos?.[0]?.id || data.seasons?.[0]?.episodes?.[0]?.id
        if (mediaId) {
          getMediaLinks(mediaId).then(links => {
            if (cancelled) return
            let enrichedData = data
            if (data.videos?.[0]) {
              enrichedData = {
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
              enrichedData = {
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

            const enrichedFiles = enrichedData.videos?.[0]?.files || enrichedData.seasons?.[0]?.episodes?.[0]?.files
            const enrichedAvailable = getAvailableQualities(enrichedFiles)
            let enrichedQuality: string | null = null
            if (defaultQuality !== 'auto' && enrichedAvailable.includes(defaultQuality)) {
              enrichedQuality = defaultQuality
            } else if (enrichedAvailable.length > 0) {
              enrichedQuality = enrichedAvailable[0]
            }
            dispatch({ type: 'UPDATE_MEDIA', item: enrichedData, selectedQuality: enrichedQuality })
          }).catch(err => {
            if (import.meta.env.DEV) console.error('getMediaLinks failed:', err)
          })
        }

        getSimilarItems(itemId).then(items => {
          if (!cancelled) dispatch({ type: 'SET_SIMILAR_ITEMS', items })
        }).catch(err => {
          if (import.meta.env.DEV) console.error('getSimilarItems failed:', err)
        })

        if (hasSeries) {
          isItemInWatchlist(itemId).then(value => {
            if (!cancelled) dispatch({ type: 'SET_IS_WATCHING', value })
          }).catch(err => {
            if (import.meta.env.DEV) console.error('isItemInWatchlist failed:', err)
          })
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({ type: 'LOAD_ERROR', error: err instanceof Error ? err.message : 'Failed to load' })
        }
      } finally {
        window.clearTimeout(safetyTimer)
      }
    }
    loadItem()
    return () => {
      cancelled = true
      window.clearTimeout(safetyTimer)
    }
  }, [itemId, t.errorLoading])

  const videoData = item?.videos?.[0] || item?.seasons?.[0]?.episodes?.[0]
  const files = videoData?.files
  const audios = videoData?.audios || []
  const subtitles = videoData?.subtitles || []
  const availableQualities = getAvailableQualities(files)

  const handlePlayOrSelect = useCallback(() => {
    if (!item) {
      if (!preview) return
      const seriesLike = preview.type === 'serial' || preview.type === 'docuserial' || preview.type === 'tvshow'
      if (seriesLike) onSelectSeries(itemId)
      else onPlay(itemId)
      return
    }
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
  }, [item, preview, focusArea, itemId, onPlay, onSelectSeries, selectedQuality])

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
  const cast = item?.actors || []
  const summaryCast = cast.slice(0, 6)
  const activeCast = detailsExpanded ? cast : summaryCast

  const scrollDetailsToTop = useCallback(() => {
    if (detailsPageRef.current) detailsPageRef.current.scrollTop = 0
  }, [])

  const scrollDetailsBy = useCallback((delta: number) => {
    const page = detailsPageRef.current
    if (page) page.scrollTop = Math.max(0, page.scrollTop + delta)
  }, [])

  const openDetails = useCallback(() => {
    const nextFocus: FocusArea = cast.length > 0
      ? 'cast'
      : 'details'

    dispatch({ type: 'OPEN_DETAILS', focusArea: nextFocus })
    if (nextFocus === 'cast') dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
  }, [cast.length])

  const closeDetails = useCallback(() => {
    const primaryButton: FocusArea = item?.seasons?.length ? 'seasons' : 'play'
    dispatch({ type: 'CLOSE_DETAILS', focusArea: primaryButton })
  }, [item?.seasons?.length])

  useEffect(() => {
    if (detailsExpanded) scrollDetailsToTop()
  }, [detailsExpanded, scrollDetailsToTop])

  useEffect(() => {
    if (focusArea !== 'similar' || !detailsExpanded) return
    const page = detailsPageRef.current
    if (!page) return
    const cell = page.querySelector(`[data-similar-index="${similarFocusIndex}"]`) as HTMLElement | null
    if (!cell) return

    const pageRect = page.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()
    const pad = 24
    if (cellRect.top < pageRect.top + pad) {
      page.scrollTop += cellRect.top - pageRect.top - pad
    } else if (cellRect.bottom > pageRect.bottom - pad) {
      page.scrollTop += cellRect.bottom - pageRect.bottom + pad
    }
  }, [focusArea, similarFocusIndex, detailsExpanded, similarPerRow])

  useWheelScroll({
    containerRef: detailsPageRef,
    enabled: isActive && detailsExpanded && !showFolderDialog,
  })

  useEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) < 24) return

    if (!detailsExpanded && event.deltaY > 0) {
      event.preventDefault()
      openDetails()
      return
    }

    if (detailsExpanded && event.deltaY < 0 && (detailsPageRef.current?.scrollTop || 0) <= 0) {
      event.preventDefault()
      closeDetails()
    }
  }, isActive && !!item && !showFolderDialog && focusArea !== 'qualitySelect')

  const handlers = useMemo(() => {
    const hasSeries = item?.seasons && item.seasons.length > 0
    const hasSimilar = similarItems.length > 0
    const hasTrailer = !!item?.trailer?.url
    const hasGenres = genres.length > 0
    const hasCast = activeCast.length > 0
    const primaryButton: FocusArea = hasSeries ? 'seasons' : 'play'

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
        onBack: () => dispatch({ type: 'SET_FOCUS_AREA', area: 'play' }),
        onRed: () => dispatch({ type: 'SET_FOCUS_AREA', area: 'play' })
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
        onDown: () => dispatch({ type: 'SET_FOCUS_AREA', area: primaryButton }),
        onEnter: () => {
          const genre = genres[metaFocusIndex]
          const type = item?.type || preview?.type
          if (genre && type) onSelectGenre?.(genre.id, type)
        }
      }
    }

    if (focusArea === 'cast') {
      return {
        onBack: detailsExpanded ? closeDetails : onBack,
        onLeft: () => {
          if (metaFocusIndex > 0) {
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: metaFocusIndex - 1 })
          } else {
            onNavigateToMenu()
          }
        },
        onRight: () => dispatch({ type: 'SET_META_FOCUS_INDEX', index: Math.min(activeCast.length - 1, metaFocusIndex + 1) }),
        onUp: () => {
          if (detailsExpanded) {
            closeDetails()
          } else if (hasGenres) {
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
          } else {
            scrollDetailsBy(260)
          }
        },
        onEnter: () => {
          const actor = activeCast[metaFocusIndex]
          if (actor) onSelectActor?.(actor.name)
        }
      }
    }

    if (focusArea === 'similar') {
      const similarNav = createGridNavigationHandlers({
        itemCount: similarCount,
        itemsPerRow: similarPerRow,
        focusedIndex: similarFocusIndex,
        setFocusedIndex: (index) => dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index }),
        onSelect: (index) => {
          const selectedItem = similarItems[index]
          if (selectedItem) onSelectItem(selectedItem.id, selectedItem)
        },
        onLeftEdge: onNavigateToMenu,
        onTopEdge: () => {
          if (hasCast) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'cast' })
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
            scrollDetailsToTop()
          } else if (detailsExpanded) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'details' })
            scrollDetailsToTop()
          } else if (hasGenres) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'genres' })
            dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
          } else {
            dispatch({ type: 'SET_FOCUS_AREA', area: primaryButton })
          }
        }
      })
      return {
        onBack: detailsExpanded ? closeDetails : onBack,
        ...similarNav
      }
    }

    if (focusArea === 'details') {
      return {
        onBack: closeDetails,
        onUp: () => {
          if ((detailsPageRef.current?.scrollTop || 0) > 0) {
            scrollDetailsBy(-260)
          } else {
            closeDetails()
          }
        },
        onDown: () => {
          if (hasSimilar) {
            dispatch({ type: 'SET_FOCUS_AREA', area: 'similar' })
            dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index: 0 })
          } else {
            scrollDetailsBy(260)
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
        } else if (hasGenres) {
          dispatch({ type: 'SET_FOCUS_AREA', area: 'genres' })
          dispatch({ type: 'SET_META_FOCUS_INDEX', index: 0 })
        }
      },
      onDown: openDetails,
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
  }, [item, preview, focusArea, availableQualities, dropdownFocusIndex, selectedQuality, onBack, onNavigateToMenu, handlePlayOrSelect, handleOpenFolderDialog, handleToggleFolder, handleToggleWatching, similarItems, similarFocusIndex, similarCount, similarPerRow, metaFocusIndex, genres, cast, activeCast, onSelectItem, onSelectGenre, onSelectActor, showFolderDialog, folders, folderFocusIndex, onPlayTrailer, t, itemId, detailsExpanded, openDetails, closeDetails, scrollDetailsBy, scrollDetailsToTop])

  useKeyboardNavigation(handlers, isActive && !!(item || preview))

  const shell: ItemDetailsType | null = item || (preview
    ? {
        ...preview,
        directors: [],
        actors: [],
        countries: [],
        genres: []
      }
    : null)

  if (loading && !shell) {
    return (
      <div class="item-screen">
        <LoadingState />
      </div>
    )
  }

  if ((error && !shell) || !shell) {
    return (
      <div class="item-screen">
        <div class="item-loading">
          <span style={{ color: '#e50914' }}>{error || t.errorLoading}</span>
        </div>
      </div>
    )
  }

  // Spinner while the wide URL is unknown or its bitmap is still decoding.
  // The <img> mounts only after useDecodedImage pre-decoded it off-DOM, so the
  // mount both paints instantly and forces the invalidation webOS drops.
  const bannerPending = posterUrl
    ? !bannerReady
    : (loading || (!!preview && !item))
  const hasSeasons = Boolean(item?.seasons && item.seasons.length > 0) ||
    (!item && (preview?.type === 'serial' || preview?.type === 'docuserial' || preview?.type === 'tvshow'))
  const durationMinutes = item?.duration?.average
    ? item.duration.average > 300
      ? Math.floor(item.duration.average / 60)
      : item.duration.average
    : null
  const duration = durationMinutes
    ? durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)} ${t.hourShort}${durationMinutes % 60 ? ` ${durationMinutes % 60} ${t.minuteShort}` : ''}`
      : `${durationMinutes} ${t.minuteShort}`
    : null

  const itemTypeLabels: Record<string, string> = {
    movie: t.typeMovie,
    serial: t.typeSeries,
    documovie: t.typeDocumentary,
    docuserial: t.typeDocuseries,
    tvshow: t.typeTvShow,
    concert: t.typeConcert,
    '3D': t.type3D,
  }
  const itemTypeLabel = itemTypeLabels[shell.type] || shell.type

  const kpRating = Number(shell.kinopoiskRating) || 0
  const imdbRating = Number(shell.imdbRating) || 0
  const kinopubRating = Number(shell.ratingPercentage) || 0
  const directors = item?.directors?.slice(0, 3) || []
  const countries = item?.countries?.slice(0, 3).map(c => c.title).join(', ')

  return (
    <>
    <div class="item-screen">
      <div class="item-banner">
        {bannerPending && (
          <div class="item-banner-loading" aria-hidden="true">
            <LoadingSpinner size="md" />
          </div>
        )}
        {posterUrl && bannerReady && bannerImage && (
          <canvas
            ref={bannerCanvasRef}
            class="item-banner-image"
            data-src={posterUrl}
          />
        )}
      </div>

      <div class={`item-content ${detailsExpanded ? 'details-expanded' : ''}`}>
        <section class="item-summary" aria-hidden={detailsExpanded}>
          <div class="item-summary-main">
            <h1 class="item-title">{shell.title}</h1>

            <div class="item-meta">
              <span class="item-year">{shell.year}</span>
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
              {kinopubRating > 0 && (
                <span class="item-rating item-rating-kinopub">
                  <img src={thumbUpIcon} alt="" class="item-rating-icon" />
                  {kinopubRating}%
                </span>
              )}
              {duration && <span class="item-duration">{duration}</span>}
              <span class="item-type">{itemTypeLabel}</span>
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
                    onClick={() => onSelectGenre?.(genre.id, shell.type)}
                  >
                    {genre.title}
                  </button>
                ))}
              </div>
            )}

            {(countries || directors.length > 0 || summaryCast.length > 0) && (
              <ItemDetails
                className="item-summary-details"
                countries={countries}
                directors={directors}
                actors={summaryCast}
                maxActors={6}
                focusedActorIndex={!detailsExpanded && focusArea === 'cast' ? metaFocusIndex : null}
                onHoverActor={(index) => {
                  dispatch({ type: 'SET_FOCUS_AREA', area: 'cast' })
                  dispatch({ type: 'SET_META_FOCUS_INDEX', index })
                }}
                onSelectActor={onSelectActor}
                onSelectDirector={onSelectDirector}
              />
            )}

            <div class="item-actions">
                {hasSeasons ? (
                  <button
                    type="button"
                    class={`item-button item-button-primary ${focusArea === 'seasons' ? 'focused' : ''}`}
                    onMouseEnter={() => dispatch({ type: 'SET_FOCUS_AREA', area: 'seasons' })}
                    onClick={handlePlayOrSelect}
                  >
                    <span class="item-button-icon">≡</span>
                    {item?.seasons?.length
                      ? `${t.seasons} (${item.seasons.length})`
                      : t.seasons}
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
                      <>
                        <div
                          class="item-dropdown-backdrop"
                          onClick={() => dispatch({ type: 'SET_FOCUS_AREA', area: 'play' })}
                        />
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
                      </>
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
                      if (item?.trailer?.url) {
                        onPlayTrailer(item.trailer.url, `${shell.title} - ${t.trailer}`)
                      }
                    }}
                  >
                    <span class="item-button-icon">▷</span>
                    {t.trailer}
                  </button>
                )}
            </div>

            {item?.plot && <p class="item-plot-preview">{item.plot}</p>}

            <button
              type="button"
              class="item-scroll-hint"
              onClick={openDetails}
            >
              <span class="item-scroll-hint-icon" aria-hidden="true" />
              <span>{t.fullInfo}</span>
            </button>
          </div>
        </section>

        <section
          ref={detailsPageRef}
          class="item-details-page"
          aria-hidden={!detailsExpanded}
        >
          <button
            type="button"
            class="item-details-back"
            onClick={closeDetails}
          >
            <span class="item-details-back-icon" aria-hidden="true" />
            <span>{t.backToSummary}</span>
          </button>

          <div class="item-details-body">
            <div class="item-details-copy">
              <h2 class="item-details-title">{shell.title}</h2>
              {item?.plot && (
                <>
                  <h3 class="item-details-section-title">{t.synopsis}</h3>
                  <p class="item-plot-full">{item.plot}</p>
                </>
              )}
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
              onSelectDirector={onSelectDirector}
            />
          </div>

          <SimilarItems
            items={similarItems}
            focusedIndex={similarFocusIndex}
            isFocused={focusArea === 'similar'}
            cardWidth={similarCardWidth || undefined}
            onHoverItem={(index) => {
              dispatch({ type: 'SET_FOCUS_AREA', area: 'similar' })
              dispatch({ type: 'SET_SIMILAR_FOCUS_INDEX', index })
            }}
            onSelectItem={onSelectItem}
          />
        </section>
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
