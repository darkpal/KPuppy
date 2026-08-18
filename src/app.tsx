import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import { AuthScreen } from './screens/AuthScreen'
import { MainScreen } from './screens/MainScreen'
import { ItemScreen } from './screens/ItemScreen'
import { SearchScreen, SearchScreenState, DEFAULT_SEARCH_STATE } from './screens/SearchScreen'
import { CategoryScreen, CategoryFilters, DEFAULT_CATEGORY_FILTERS } from './screens/CategoryScreen'
import { BookmarksScreen } from './screens/BookmarksScreen'
import { CollectionsScreen } from './screens/CollectionsScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { LiveTVScreen } from './screens/LiveTVScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { UserScreen } from './screens/UserScreen'
import { SeasonsScreen } from './screens/SeasonsScreen'
import { NewEpisodesScreen } from './screens/NewEpisodesScreen'
import { PlayerScreen } from './screens/PlayerScreen'
import { RemoteDebugOverlay } from './components/RemoteDebugOverlay'
import { LoadingState } from './components/LoadingSpinner'
import { ALL_MENU_ITEMS_COUNT, getMenuIdByIndex, getMenuIndexById } from './components/SideMenu'
import { KEY_CODES } from './hooks'
import { ScreenManager } from './components/ScreenManager'
import { isAuthenticated, clearTokens, getTokens, getLocalSettings, saveReturnTo, getReturnTo, clearReturnTo, getContentTypesCache, saveContentTypesCache, getSavedAudioPreference, findAudioIndex, getLocalPlaybackProgress, ReturnToState } from './storage'
import { refreshAccessToken, getItem, getMediaLinks, setOnAuthError, getDeviceInfo, markTime, invalidatePlaybackLists, getWatchingProgress, getContentTypes, registerDevice, VideoFile, Audio, Subtitle, MovieItem } from './api/kinopub'
import { applyPreferredDeviceDefaultsOnce } from './preferredDefaults'
import { saveTokens } from './storage'
import { launchNativePlayer, getStreamUrl, withHlsAudioIndex, getAvailableQualities } from './webos/player'
import { platformBack } from './webos/service'
import { mergeResumeTime } from './utils/watching'
import { buildSeasonsSummary, getEpisodeNeighbors, type EpisodeNavigationTarget, type SeasonSummary } from './utils/episodes'
import { buildVideosSummary, findVideoByNumber } from './utils/videoVersions'
import { useI18n } from './i18n'
import { Translations } from './i18n/translations'
import './styles/global.css'
import './styles/sidemenu.css'

type FocusArea = 'menu' | 'content'

interface ScreenFocusState {
  row: number
  col: number
}

interface PlayerState {
  url: string
  title: string
  poster?: string
  audios: Audio[]
  subtitles: Subtitle[]
  files: VideoFile[]
  streamingType?: string
  initialQuality?: string
  itemId: number
  /** Episode/video number for Kinopub marktime API */
  video: number
  season?: number
  episode?: number
  previousEpisode?: EpisodeNavigationTarget
  nextEpisode?: EpisodeNavigationTarget
  seasonsSummary?: SeasonSummary[]
  startTime: number
  initialAudioIndex: number
}

interface NavHistoryEntry {
  itemId: number | null
  itemPreview: MovieItem | null
  selectedMenuId: string
  searchState: SearchScreenState | null
  categoryGenreId: number | null
  categoryFilters: CategoryFilters | null
}

interface AppState {
  authenticated: boolean
  selectedMenuId: string
  itemId: number | null
  itemPreview: MovieItem | null
  seriesId: number | null
  focusArea: FocusArea
  menuFocusIndex: number
  screenFocus: Record<string, ScreenFocusState>
  returnToItemId: number | null
  returnToSeriesId: number | null
  player: PlayerState | null
  playerPreparing: boolean
  searchState: SearchScreenState | null
  /**
   * Bumped only when search is opened/replaced from outside typing
   * (actor/director chip, Back through navHistory). Must NOT include the
   * query string — that remounted SearchScreen on every keystroke and killed
   * the webOS system keyboard.
   */
  searchInstance: number
  /** Stack of previous screens for actor/director drill-down; Back pops. */
  navHistory: NavHistoryEntry[]
  categoryGenreId: number | null
  categoryFilters: CategoryFilters | null
  bookmarksState: {
    folderId: number | null
    folderIndex: number
    itemIndex: number
  } | null
}

const ITEM_TYPE_TO_CATEGORY: Record<string, string> = {
  movie: 'movies',
  serial: 'series',
  concert: 'concerts',
  '3D': '3d',
  documovie: 'docs',
  tvshow: 'tvshows',
}

const CATEGORY_TITLE_KEYS: Record<string, keyof Translations> = {
  home: 'menuHome',
  search: 'menuSearch',
  watching: 'categoryContinueWatching',
  movies: 'categoryMovies',
  series: 'categorySeries',
  concerts: 'categoryConcerts',
  '3d': 'category3D',
  docs: 'categoryDocs',
  tvshows: 'categoryTvShows',
}

function applyReturnTo(state: AppState, saved: ReturnToState): AppState {
  const selectedMenuId = saved.selectedMenuId || state.selectedMenuId
  return {
    ...state,
    selectedMenuId,
    menuFocusIndex: getMenuIndexById(selectedMenuId),
    itemId: saved.itemId,
    seriesId: saved.seriesId,
    screenFocus: saved.screenFocus || state.screenFocus,
    returnToItemId: null,
    returnToSeriesId: null
  }
}

export function App() {
  const { t } = useI18n()
  const [state, setState] = useState<AppState>(() => {
    const initial: AppState = {
      authenticated: isAuthenticated(),
      selectedMenuId: 'home',
      itemId: null,
      itemPreview: null,
      seriesId: null,
      focusArea: 'content',
      menuFocusIndex: 0,
      screenFocus: {},
      returnToItemId: null,
      returnToSeriesId: null,
      player: null,
      playerPreparing: false,
      searchState: null,
      searchInstance: 0,
      navHistory: [],
      categoryGenreId: null,
      categoryFilters: null,
      bookmarksState: null
    }

    const savedReturnTo = getReturnTo()
    if (savedReturnTo) {
      clearReturnTo()
      return applyReturnTo(initial, savedReturnTo)
    }
    return initial
  })
  const [initializing, setInitializing] = useState(true)
  const stateRef = useRef(state)
  stateRef.current = state
  const playInFlightRef = useRef(false)

  useEffect(() => {
    async function checkAndRefreshToken() {
      const tokens = getTokens()
      if (!tokens) {
        setState(prev => ({ ...prev, authenticated: false }))
        setInitializing(false)
        return
      }

      if (Date.now() >= tokens.expiresAt) {
        try {
          const newTokens = await refreshAccessToken(tokens.refresh)
          saveTokens({
            access: newTokens.accessToken,
            refresh: newTokens.refreshToken,
            expiresAt: Date.now() + newTokens.expiresIn * 1000
          })
          setState(prev => ({ ...prev, authenticated: true }))
        } catch {
          clearTokens()
          setState(prev => ({ ...prev, authenticated: false }))
        }
      } else {
        setState(prev => ({ ...prev, authenticated: true }))
      }

      setInitializing(false)
    }

    checkAndRefreshToken()
  }, [])

  useEffect(() => {
    if (!state.authenticated) return

    registerDevice()
      .catch(err => {
        if (import.meta.env.DEV) console.error('registerDevice failed:', err)
      })
      .then(() => applyPreferredDeviceDefaultsOnce())
      .catch(err => {
        if (import.meta.env.DEV) console.error('applyPreferredDeviceDefaultsOnce failed:', err)
      })
  }, [state.authenticated])

  useEffect(() => {
    if (!state.authenticated) return

    const cached = getContentTypesCache()
    if (cached) return

    getContentTypes()
      .then(types => saveContentTypesCache(types))
      .catch(err => {
        if (import.meta.env.DEV) console.error('getContentTypes failed:', err)
      })
  }, [state.authenticated])

  const handleAuthenticated = useCallback(() => {
    setState(prev => ({ ...prev, authenticated: true }))
  }, [])

  const handleLogout = useCallback(() => {
    clearTokens()
    setState(prev => ({ ...prev, authenticated: false, itemId: null, seriesId: null, selectedMenuId: 'home' }))
  }, [])

  useEffect(() => {
    setOnAuthError(handleLogout)
    return () => setOnAuthError(null)
  }, [handleLogout])

  const handleSelectItem = useCallback((itemId: number, preview?: MovieItem) => {
    setState(prev => ({ ...prev, itemId, itemPreview: preview ?? null }))
  }, [])

  const handleBackFromItem = useCallback(() => {
    setState(prev => ({ ...prev, itemId: null, seriesId: null, itemPreview: null }))
  }, [])

  const handleSelectSeries = useCallback((seriesId: number) => {
    setState(prev => ({ ...prev, seriesId, itemId: null, itemPreview: null }))
  }, [])

  const handleBackFromSeries = useCallback(() => {
    setState(prev => ({ ...prev, itemId: prev.seriesId, seriesId: null, itemPreview: null }))
  }, [])

  const handleFocusChange = useCallback((screenId: string, row: number, col: number) => {
    setState(prev => ({
      ...prev,
      screenFocus: {
        ...prev.screenFocus,
        [screenId]: { row, col }
      }
    }))
  }, [])

  const handleMenuSelect = useCallback((menuId: string) => {
    setState(prev => ({
      ...prev,
      selectedMenuId: menuId,
      menuFocusIndex: getMenuIndexById(menuId),
      focusArea: 'content',
      itemId: null,
      itemPreview: null,
      seriesId: null,
      // Drop search/category filters when leaving that section via the menu.
      searchState: menuId === 'search' ? prev.searchState : null,
      navHistory: [],
      bookmarksState: menuId === 'bookmarks' ? prev.bookmarksState : null,
      categoryGenreId: null,
      categoryFilters: null
    }))
  }, [])

  const handleSelectGenre = useCallback((genreId: number, itemType: string) => {
    const categoryId = ITEM_TYPE_TO_CATEGORY[itemType] || 'movies'
    setState(prev => ({
      ...prev,
      itemId: null,
      seriesId: null,
      selectedMenuId: categoryId,
      menuFocusIndex: getMenuIndexById(categoryId),
      categoryGenreId: genreId,
      categoryFilters: { ...DEFAULT_CATEGORY_FILTERS, genreId },
      searchState: null,
      navHistory: [],
      focusArea: 'content'
    }))
  }, [])

  const handleCategoryFiltersChange = useCallback((filters: CategoryFilters) => {
    setState(prev => ({
      ...prev,
      categoryFilters: filters,
      categoryGenreId: filters.genreId
    }))
  }, [])

  const handleSearchStateChange = useCallback((searchState: SearchScreenState) => {
    setState(prev => ({ ...prev, searchState }))
  }, [])

  const handleBookmarksStateChange = useCallback((bookmarksState: {
    folderId: number | null
    folderIndex: number
    itemIndex: number
  }) => {
    setState(prev => ({ ...prev, bookmarksState }))
  }, [])

  const pushPersonSearch = useCallback((name: string, field: 'actor' | 'director') => {
    setState(prev => {
      const entry: NavHistoryEntry = {
        itemId: prev.itemId,
        itemPreview: prev.itemPreview,
        selectedMenuId: prev.selectedMenuId,
        searchState: prev.searchState,
        categoryGenreId: prev.categoryGenreId,
        categoryFilters: prev.categoryFilters
      }
      // Only push when leaving a real screen (item or an earlier search).
      const shouldPush = prev.itemId != null || prev.searchState != null
      return {
        ...prev,
        navHistory: shouldPush ? [...prev.navHistory, entry] : prev.navHistory,
        itemId: null,
        itemPreview: null,
        seriesId: null,
        selectedMenuId: 'search',
        menuFocusIndex: getMenuIndexById('search'),
        searchState: { ...DEFAULT_SEARCH_STATE, query: name, field },
        searchInstance: prev.searchInstance + 1,
        categoryGenreId: null,
        categoryFilters: null,
        focusArea: 'content'
      }
    })
  }, [])

  const handleSelectActor = useCallback((name: string) => {
    pushPersonSearch(name, 'actor')
  }, [pushPersonSearch])

  const handleSelectDirector = useCallback((name: string) => {
    pushPersonSearch(name, 'director')
  }, [pushPersonSearch])

  const handleBackFromSearch = useCallback(() => {
    setState(prev => {
      if (prev.navHistory.length === 0) {
        return {
          ...prev,
          selectedMenuId: 'home',
          menuFocusIndex: getMenuIndexById('home'),
          focusArea: 'content',
          itemId: null,
          itemPreview: null,
          seriesId: null,
          searchState: null,
          navHistory: [],
          categoryGenreId: null,
          categoryFilters: null
        }
      }

      const navHistory = prev.navHistory.slice(0, -1)
      const target = prev.navHistory[prev.navHistory.length - 1]
      return {
        ...prev,
        selectedMenuId: target.selectedMenuId,
        menuFocusIndex: getMenuIndexById(target.selectedMenuId),
        itemId: target.itemId,
        itemPreview: target.itemPreview,
        seriesId: null,
        searchState: target.searchState,
        // Remount search when restoring a previous query from the stack.
        searchInstance: target.selectedMenuId === 'search'
          ? prev.searchInstance + 1
          : prev.searchInstance,
        navHistory,
        categoryGenreId: target.categoryGenreId,
        categoryFilters: target.categoryFilters,
        focusArea: 'content'
      }
    })
  }, [])

  const handleNavigateToMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      focusArea: 'menu',
      // Land on the current section, not a stale index from an earlier visit.
      menuFocusIndex: getMenuIndexById(prev.selectedMenuId)
    }))
  }, [])

  const handleTimeUpdate = useCallback((time: number) => {
    const player = stateRef.current.player
    if (!player || !player.itemId) return
    markTime({
      id: player.itemId,
      time: Math.floor(time),
      video: player.video,
      season: player.season
    }).catch(err => {
      if (import.meta.env.DEV) console.error('markTime failed:', err)
    })
  }, [])

  const handleClosePlayer = useCallback(() => {
    if (stateRef.current.player?.itemId) invalidatePlaybackLists()
    setState(prev => ({ ...prev, player: null, playerPreparing: false }))
  }, [])

  const handlePlayTrailer = useCallback((url: string, title: string) => {
    // Show the same preparing spinner as VOD so pointer clicks feel acknowledged
    // before the player mounts (live TV / trailers have no async prefetch).
    setState(prev => ({ ...prev, playerPreparing: true, player: null }))
    window.setTimeout(() => {
      setState(prev => ({
        ...prev,
        playerPreparing: false,
        player: {
          url,
          title,
          audios: [],
          subtitles: [],
          files: [],
          itemId: 0,
          video: 1,
          startTime: 0,
          initialAudioIndex: 0
        }
      }))
    }, 80)
  }, [])

  const handlePlay = useCallback(async (itemId: number, season?: number, episode?: number, options?: { quality?: string; video?: number }) => {
    if (playInFlightRef.current) return
    playInFlightRef.current = true

    const localSettings = getLocalSettings()
    setState(prev => ({ ...prev, playerPreparing: true }))

    if (localSettings.playerType === 'native') {
      const { itemId: currentItemId, seriesId, selectedMenuId, screenFocus } = stateRef.current
      saveReturnTo({ itemId: currentItemId, seriesId, selectedMenuId, screenFocus })
      setState(prev => ({
        ...prev,
        returnToItemId: prev.itemId,
        returnToSeriesId: prev.seriesId
      }))
    }

    try {
      const item = await getItem(itemId)
      const isSeries = Boolean(item.seasons && item.seasons.length > 0)
      const episodeNeighbors = isSeries
        ? getEpisodeNeighbors(item.seasons, season, episode)
        : { previousEpisode: undefined, nextEpisode: undefined }

      let files = item.videos?.[0]?.files
      let audios = item.videos?.[0]?.audios || []
      let subtitles = item.videos?.[0]?.subtitles || []
      let title = item.title
      let videoNumber = item.videos?.[0]?.number || 1
      let mediaId = item.videos?.[0]?.id
      let serverWatching = item.videos?.[0]?.watching
      let durationForResume = item.videos?.[0]?.duration

      if (isSeries && season !== undefined && episode !== undefined) {
        const seasonData = item.seasons?.find(s => s.number === season)
        const episodeData = seasonData?.episodes.find(e => e.number === episode)
        if (episodeData) {
          files = episodeData.files
          audios = episodeData.audios || []
          subtitles = episodeData.subtitles || []
          videoNumber = episodeData.number
          mediaId = episodeData.id
          title = `${item.title} - S${season}E${episode}`
          if (episodeData.title) title += ` - ${episodeData.title}`
          serverWatching = episodeData.watching
          durationForResume = episodeData.duration
        }
      } else {
        const requestedVideo = options?.video ?? (!isSeries && episode !== undefined ? episode : undefined)
        const video = findVideoByNumber(item.videos, requestedVideo)
        if (video) {
          files = video.files
          audios = video.audios || []
          subtitles = video.subtitles || []
          videoNumber = video.number || 1
          mediaId = video.id
          serverWatching = video.watching
          durationForResume = video.duration
          const versionName = (video.title || '').trim()
          if (versionName) title = `${item.title} — ${versionName}`
        }
      }

      const [linksResult, progressResult, deviceResult] = await Promise.all([
        mediaId
          ? getMediaLinks(mediaId).catch(err => {
              if (import.meta.env.DEV) console.error('getMediaLinks failed:', err)
              return null
            })
          : Promise.resolve(null),
        getWatchingProgress(itemId, videoNumber, isSeries ? season : undefined).catch(() => null),
        getDeviceInfo().catch(() => null)
      ])

      if (linksResult) {
        if (linksResult.files.length > 0) files = linksResult.files
        if (linksResult.subtitles.length > 0) subtitles = linksResult.subtitles
      }
      const startTime = mergeResumeTime(
        progressResult || serverWatching,
        getLocalPlaybackProgress(itemId, videoNumber, isSeries ? season : undefined),
        durationForResume
      )

      const preferredQuality = options?.quality || (localSettings.defaultQuality === 'auto' ? undefined : localSettings.defaultQuality)

      const streamingType: string | undefined = deviceResult?.settings.streamingType
        ?.find(t => t.selected === 1)
        ?.label
        ?.toLowerCase()

      let streamUrl = getStreamUrl(
        files || [],
        preferredQuality,
        streamingType,
        localSettings.playerType === 'builtin' ? { preferClassicHls: true } : undefined
      )
      if (!streamUrl) return

      const savedAudio = getSavedAudioPreference(itemId)
      const initialAudioIndex = findAudioIndex(audios, savedAudio)
      if (localSettings.playerType === 'builtin' && initialAudioIndex > 0) {
        streamUrl = withHlsAudioIndex(streamUrl, initialAudioIndex)
      }

      if (localSettings.playerType === 'builtin') {
        const available = getAvailableQualities(files)
        const initialQuality = preferredQuality && available.includes(preferredQuality)
          ? preferredQuality
          : available[0]

        setState(prev => ({
          ...prev,
          playerPreparing: false,
          player: {
            url: streamUrl,
            title,
            poster: item.posters?.wide || item.posters?.big || item.posters?.medium,
            audios,
            subtitles,
            files: files || [],
            streamingType,
            initialQuality,
            itemId,
            video: videoNumber,
            season: isSeries ? season : undefined,
            episode: isSeries ? episode : videoNumber,
            previousEpisode: episodeNeighbors.previousEpisode,
            nextEpisode: episodeNeighbors.nextEpisode,
            seasonsSummary: isSeries ? buildSeasonsSummary(item.seasons) : buildVideosSummary(item.videos),
            startTime,
            initialAudioIndex
          }
        }))
      } else {
        await launchNativePlayer({
          fullPath: streamUrl,
          fileName: title,
          thumbnail: item.posters?.wide || item.posters?.medium,
          lastPlayPosition: startTime > 0 ? startTime : -1
        })
      }
    } catch {
    } finally {
      playInFlightRef.current = false
      setState(prev => (prev.playerPreparing ? { ...prev, playerPreparing: false } : prev))
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const savedReturnTo = getReturnTo()
        if (savedReturnTo) {
          clearReturnTo()
        }
        setState(prev => {
          if (savedReturnTo) {
            return applyReturnTo(prev, savedReturnTo)
          }
          if (prev.returnToItemId !== null || prev.returnToSeriesId !== null) {
            return {
              ...prev,
              itemId: prev.returnToItemId,
              seriesId: prev.returnToSeriesId,
              returnToItemId: null,
              returnToSeriesId: null
            }
          }
          return prev
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (!state.authenticated) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (state.focusArea === 'menu') {
        switch (event.keyCode) {
          case KEY_CODES.UP:
            setState(prev => ({
              ...prev,
              menuFocusIndex: Math.max(0, prev.menuFocusIndex - 1)
            }))
            event.preventDefault()
            break

          case KEY_CODES.DOWN:
            setState(prev => ({
              ...prev,
              menuFocusIndex: Math.min(ALL_MENU_ITEMS_COUNT - 1, prev.menuFocusIndex + 1)
            }))
            event.preventDefault()
            break

          case KEY_CODES.RIGHT:
            setState(prev => ({ ...prev, focusArea: 'content' }))
            event.preventDefault()
            break

          case KEY_CODES.ENTER: {
            const menuId = getMenuIdByIndex(state.menuFocusIndex)
            if (menuId) {
              handleMenuSelect(menuId)
            }
            event.preventDefault()
            break
          }

          case KEY_CODES.BACK:
            if (state.seriesId) {
              handleBackFromSeries()
            } else if (state.itemId) {
              handleBackFromItem()
            } else {
              platformBack()
            }
            event.preventDefault()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.authenticated, state.focusArea, state.menuFocusIndex, state.itemId, state.seriesId, handleMenuSelect, handleBackFromItem, handleBackFromSeries])

  if (initializing) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#141414'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #333',
          borderTopColor: '#e50914',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!state.authenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />
  }

  if (state.player) {
    return (
      <>
        <PlayerScreen
          url={state.player.url}
          title={state.player.title}
          poster={state.player.poster}
          audios={state.player.audios}
          subtitles={state.player.subtitles}
          files={state.player.files}
          streamingType={state.player.streamingType}
          initialQuality={state.player.initialQuality}
          startTime={state.player.startTime}
          initialAudioIndex={state.player.initialAudioIndex}
          itemId={state.player.itemId}
          previousEpisode={state.player.previousEpisode}
          nextEpisode={state.player.nextEpisode}
          season={state.player.season}
          episode={state.player.episode}
          seasonsSummary={state.player.seasonsSummary}
          onPlayPreviousEpisode={state.player.previousEpisode ? () => {
            const player = stateRef.current.player
            const target = player?.previousEpisode
            if (player && target) void handlePlay(player.itemId, target.season, target.episode, { quality: player.initialQuality })
          } : undefined}
          onPlayNextEpisode={state.player.nextEpisode ? () => {
            const player = stateRef.current.player
            const target = player?.nextEpisode
            if (player && target) void handlePlay(player.itemId, target.season, target.episode, { quality: player.initialQuality })
          } : undefined}
          onPlayEpisode={state.player.seasonsSummary?.length ? (targetSeason, targetEpisode) => {
            const player = stateRef.current.player
            if (player) void handlePlay(player.itemId, targetSeason, targetEpisode, { quality: player.initialQuality })
          } : undefined}
          onBack={handleClosePlayer}
          onTimeUpdate={handleTimeUpdate}
        />
        {state.playerPreparing && (
          <div class="player-preparing-overlay" role="status" aria-live="polite">
            <LoadingState size="lg" message={t.loading} className="loading-container-fullheight" />
          </div>
        )}
      </>
    )
  }

  if (state.playerPreparing) {
    return (
      <div class="player-preparing-overlay player-preparing-overlay-alone" role="status" aria-live="polite">
        <LoadingState size="lg" message={t.loading} className="loading-container-fullheight" />
      </div>
    )
  }

  const isContentActive = state.focusArea === 'content'
  const isMenuFocused = state.focusArea === 'menu'
  const overlayOpen = Boolean(state.itemId || state.seriesId)
  const baseActive = isContentActive && !overlayOpen

  const renderBaseScreen = () => {
    switch (state.selectedMenuId) {
      case 'home': {
        const homeFocus = state.screenFocus['home'] || { row: 0, col: 0 }
        return (
          <MainScreen
            onBack={handleNavigateToMenu}
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={baseActive}
            initialFocusRow={homeFocus.row}
            initialFocusCol={homeFocus.col}
            onFocusChange={(row, col) => handleFocusChange('home', row, col)}
          />
        )
      }
      case 'search': {
        const searchFocus = state.screenFocus['search'] || { row: 0, col: 0 }
        return (
          <SearchScreen
            key={`search-${state.searchInstance}`}
            onBack={handleBackFromSearch}
            exitDirectlyOnBack={state.navHistory.length > 0}
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={baseActive}
            initialState={state.searchState}
            initialFocusIndex={searchFocus.row}
            onStateChange={handleSearchStateChange}
            onFocusChange={(index) => handleFocusChange('search', index, 0)}
          />
        )
      }
      case 'settings':
        return (
          <SettingsScreen
            onNavigateToMenu={handleNavigateToMenu}
            isActive={baseActive}
          />
        )
      case 'user':
        return (
          <UserScreen
            onNavigateToMenu={handleNavigateToMenu}
            onLogout={handleLogout}
            isActive={baseActive}
          />
        )
      case 'bookmarks':
        return (
          <BookmarksScreen
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={baseActive}
            initialFolderId={state.bookmarksState?.folderId ?? null}
            initialFolderIndex={state.bookmarksState?.folderIndex ?? 0}
            initialItemIndex={state.bookmarksState?.itemIndex ?? 0}
            onStateChange={handleBookmarksStateChange}
          />
        )
      case 'collections':
        return (
          <CollectionsScreen
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={baseActive}
          />
        )
      case 'history':
        return (
          <HistoryScreen
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={baseActive}
          />
        )
      case 'watching':
        return (
          <NewEpisodesScreen
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={baseActive}
          />
        )
      case 'livetv': {
        const livetvFocus = state.screenFocus['livetv'] || { row: 0, col: 0 }
        return (
          <LiveTVScreen
            onNavigateToMenu={handleNavigateToMenu}
            onPlayChannel={handlePlayTrailer}
            isActive={baseActive}
            initialFocusIndex={livetvFocus.row}
            onFocusChange={(index) => handleFocusChange('livetv', index, 0)}
          />
        )
      }
      default: {
        const titleKey = CATEGORY_TITLE_KEYS[state.selectedMenuId]
        const title = titleKey ? t[titleKey] : state.selectedMenuId
        const categoryFocus = state.screenFocus[state.selectedMenuId] || { row: 0, col: 0 }
        return (
          <CategoryScreen
            key={state.selectedMenuId}
            categoryId={state.selectedMenuId}
            title={title}
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={baseActive}
            initialFocusIndex={categoryFocus.row}
            onFocusChange={(index) => handleFocusChange(state.selectedMenuId, index, 0)}
            initialGenreId={state.categoryGenreId}
            initialFilters={state.categoryFilters}
            onFiltersChange={handleCategoryFiltersChange}
          />
        )
      }
    }
  }

  const renderOverlay = () => {
    if (state.seriesId) {
      return (
        <div class="screen-overlay">
          <SeasonsScreen
            itemId={state.seriesId}
            onBack={handleBackFromSeries}
            onPlay={handlePlay}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
          />
        </div>
      )
    }

    if (state.itemId) {
      return (
        <div class="screen-overlay">
          <ItemScreen
            itemId={state.itemId}
            preview={state.itemPreview}
            onBack={handleBackFromItem}
            onPlay={handlePlay}
            onPlayTrailer={handlePlayTrailer}
            onSelectSeries={handleSelectSeries}
            onSelectItem={handleSelectItem}
            onSelectGenre={handleSelectGenre}
            onSelectActor={handleSelectActor}
            onSelectDirector={handleSelectDirector}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
          />
        </div>
      )
    }

    return null
  }

  return (
    <>
      <ScreenManager
        selectedMenuId={state.selectedMenuId}
        menuFocusIndex={state.menuFocusIndex}
        isMenuFocused={isMenuFocused}
        onMenuSelect={handleMenuSelect}
      >
        <div class="screen-stack">
          <div
            class={`screen-base${overlayOpen ? ' is-hidden' : ''}`}
            aria-hidden={overlayOpen}
          >
            {renderBaseScreen()}
          </div>
          {renderOverlay()}
        </div>
      </ScreenManager>
      <RemoteDebugOverlay />
    </>
  )
}
