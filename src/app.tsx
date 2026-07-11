import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import { AuthScreen } from './screens/AuthScreen'
import { MainScreen } from './screens/MainScreen'
import { ItemScreen } from './screens/ItemScreen'
import { SearchScreen } from './screens/SearchScreen'
import { CategoryScreen } from './screens/CategoryScreen'
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
import { ALL_MENU_ITEMS_COUNT, getMenuIdByIndex } from './components/SideMenu'
import { KEY_CODES } from './hooks'
import { ScreenManager } from './components/ScreenManager'
import { isAuthenticated, clearTokens, getTokens, getLocalSettings, saveReturnTo, getReturnTo, clearReturnTo, getContentTypesCache, saveContentTypesCache, ReturnToState } from './storage'
import { refreshAccessToken, getItem, setOnAuthError, getDeviceInfo, markTime, getWatchingProgress, getContentTypes, registerDevice, Audio, Subtitle } from './api/kinopub'
import { applyPreferredDeviceDefaultsOnce } from './preferredDefaults'
import { saveTokens } from './storage'
import { launchNativePlayer, getStreamUrl } from './webos/player'
import { platformBack } from './webos/service'
import { getResumeTime } from './utils/watching'
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
  audios: Audio[]
  subtitles: Subtitle[]
  itemId: number
  /** Episode/video number for Kinopub marktime API */
  video: number
  season?: number
  episode?: number
  startTime: number
}

interface AppState {
  authenticated: boolean
  selectedMenuId: string
  itemId: number | null
  seriesId: number | null
  focusArea: FocusArea
  menuFocusIndex: number
  screenFocus: Record<string, ScreenFocusState>
  returnToItemId: number | null
  returnToSeriesId: number | null
  player: PlayerState | null
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
  return {
    ...state,
    selectedMenuId: saved.selectedMenuId || state.selectedMenuId,
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
      seriesId: null,
      focusArea: 'content',
      menuFocusIndex: 0,
      screenFocus: {},
      returnToItemId: null,
      returnToSeriesId: null,
      player: null
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

  const handleSelectItem = useCallback((itemId: number) => {
    setState(prev => ({ ...prev, itemId }))
  }, [])

  const handleBackFromItem = useCallback(() => {
    setState(prev => ({ ...prev, itemId: null, seriesId: null }))
  }, [])

  const handleSelectSeries = useCallback((seriesId: number) => {
    setState(prev => ({ ...prev, seriesId, itemId: null }))
  }, [])

  const handleBackFromSeries = useCallback(() => {
    setState(prev => ({ ...prev, itemId: prev.seriesId, seriesId: null }))
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
      focusArea: 'content',
      itemId: null,
      seriesId: null
    }))
  }, [])

  const handleNavigateToMenu = useCallback(() => {
    setState(prev => ({ ...prev, focusArea: 'menu' }))
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
    setState(prev => ({ ...prev, player: null }))
  }, [])

  const handlePlayTrailer = useCallback((url: string, title: string) => {
    setState(prev => ({
      ...prev,
      player: {
        url,
        title,
        audios: [],
        subtitles: [],
        itemId: 0,
        video: 1,
        startTime: 0
      }
    }))
  }, [])

  const handleBeforeNativePlay = useCallback(() => {
    const { itemId, seriesId, selectedMenuId, screenFocus } = stateRef.current
    saveReturnTo({ itemId, seriesId, selectedMenuId, screenFocus })
  }, [])

  const handlePlay = useCallback(async (itemId: number, season?: number, episode?: number, options?: { quality?: string }) => {
    const localSettings = getLocalSettings()

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

      let files = item.videos?.[0]?.files
      let audios = item.videos?.[0]?.audios || []
      let subtitles = item.videos?.[0]?.subtitles || []
      let title = item.title
      let videoNumber = item.videos?.[0]?.number || 1
      let startTime = getResumeTime(item.videos?.[0]?.watching, item.videos?.[0]?.duration)

      if (season !== undefined && episode !== undefined && item.seasons) {
        const seasonData = item.seasons.find(s => s.number === season)
        const episodeData = seasonData?.episodes.find(e => e.number === episode)
        if (episodeData) {
          files = episodeData.files
          audios = episodeData.audios || []
          subtitles = episodeData.subtitles || []
          videoNumber = episodeData.number
          title = `${item.title} - S${season}E${episode}`
          if (episodeData.title) title += ` - ${episodeData.title}`
          startTime = getResumeTime(episodeData.watching, episodeData.duration)
        }
      }

      if (startTime <= 0) {
        try {
          const progress = await getWatchingProgress(itemId, videoNumber, season)
          startTime = getResumeTime(progress)
        } catch {
        }
      }

      const preferredQuality = options?.quality || (localSettings.defaultQuality === 'auto' ? undefined : localSettings.defaultQuality)

      let streamingType: string | undefined
      try {
        const deviceInfo = await getDeviceInfo()
        const selectedType = deviceInfo.settings.streamingType?.find(t => t.selected === 1)
        streamingType = selectedType?.label?.toLowerCase()
      } catch {
      }

      const streamUrl = getStreamUrl(
        files || [],
        preferredQuality,
        streamingType,
        localSettings.playerType === 'builtin' ? { preferClassicHls: true } : undefined
      )
      if (!streamUrl) return

      if (localSettings.playerType === 'builtin') {
        setState(prev => ({
          ...prev,
          player: {
            url: streamUrl,
            title,
            audios,
            subtitles,
            itemId,
            video: videoNumber,
            season,
            episode,
            startTime
          }
        }))
      } else {
        await launchNativePlayer({
          fullPath: streamUrl,
          fileName: title,
          thumbnail: item.posters?.medium,
          lastPlayPosition: startTime > 0 ? startTime : -1
        })
      }
    } catch {
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
      <PlayerScreen
        url={state.player.url}
        title={state.player.title}
        audios={state.player.audios}
        subtitles={state.player.subtitles}
        startTime={state.player.startTime}
        onBack={handleClosePlayer}
        onTimeUpdate={handleTimeUpdate}
      />
    )
  }

  const isContentActive = state.focusArea === 'content'
  const isMenuFocused = state.focusArea === 'menu'

  const renderScreen = () => {
    if (state.seriesId) {
      return (
        <SeasonsScreen
          itemId={state.seriesId}
          onBack={handleBackFromSeries}
          onPlay={handlePlay}
          onNavigateToMenu={handleNavigateToMenu}
          isActive={isContentActive}
        />
      )
    }

    if (state.itemId) {
      return (
        <ItemScreen
          itemId={state.itemId}
          onBack={handleBackFromItem}
          onPlay={handlePlay}
          onPlayTrailer={handlePlayTrailer}
          onSelectSeries={handleSelectSeries}
          onSelectItem={handleSelectItem}
          onNavigateToMenu={handleNavigateToMenu}
          isActive={isContentActive}
        />
      )
    }

    switch (state.selectedMenuId) {
      case 'home': {
        const homeFocus = state.screenFocus['home'] || { row: 0, col: 0 }
        return (
          <MainScreen
            onBack={handleNavigateToMenu}
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
            initialFocusRow={homeFocus.row}
            initialFocusCol={homeFocus.col}
            onFocusChange={(row, col) => handleFocusChange('home', row, col)}
          />
        )
      }
      case 'search':
        return (
          <SearchScreen
            onBack={() => handleMenuSelect('home')}
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
          />
        )
      case 'settings':
        return (
          <SettingsScreen
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
          />
        )
      case 'user':
        return (
          <UserScreen
            onNavigateToMenu={handleNavigateToMenu}
            onLogout={handleLogout}
            isActive={isContentActive}
          />
        )
      case 'bookmarks':
        return (
          <BookmarksScreen
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
          />
        )
      case 'collections':
        return (
          <CollectionsScreen
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
          />
        )
      case 'history':
        return (
          <HistoryScreen
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
          />
        )
      case 'newepisodes':
        return (
          <NewEpisodesScreen
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
          />
        )
      case 'livetv': {
        const livetvFocus = state.screenFocus['livetv'] || { row: 0, col: 0 }
        return (
          <LiveTVScreen
            onNavigateToMenu={handleNavigateToMenu}
            onBeforePlay={handleBeforeNativePlay}
            isActive={isContentActive}
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
            categoryId={state.selectedMenuId}
            title={title}
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
            initialFocusIndex={categoryFocus.row}
            onFocusChange={(index) => handleFocusChange(state.selectedMenuId, index, 0)}
          />
        )
      }
    }
  }

  return (
    <>
      <ScreenManager
        selectedMenuId={state.selectedMenuId}
        menuFocusIndex={state.menuFocusIndex}
        isMenuFocused={isMenuFocused}
        onMenuSelect={handleMenuSelect}
      >
        {renderScreen()}
      </ScreenManager>
      <RemoteDebugOverlay />
    </>
  )
}
