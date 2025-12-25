import { useState, useEffect, useCallback } from 'preact/hooks'
import { AuthScreen } from './screens/AuthScreen'
import { MainScreen } from './screens/MainScreen'
import { ItemScreen } from './screens/ItemScreen'
import { SearchScreen } from './screens/SearchScreen'
import { CategoryScreen } from './screens/CategoryScreen'
import { BookmarksScreen } from './screens/BookmarksScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { UserScreen } from './screens/UserScreen'
import { SeasonsScreen } from './screens/SeasonsScreen'
import { PlayerScreen } from './screens/PlayerScreen'
import { SideMenu, ALL_MENU_ITEMS_COUNT, getMenuIdByIndex } from './components/SideMenu'
import { isAuthenticated, clearTokens, getTokens, getLocalSettings, saveReturnTo, getReturnTo, clearReturnTo } from './storage'
import { refreshAccessToken, getItem, setOnAuthError, getDeviceInfo, Audio, Subtitle } from './api/kinopub'
import { saveTokens } from './storage'
import { launchNativePlayer, getStreamUrl } from './webos/player'
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
  season?: number
  episode?: number
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

export function App() {
  const { t } = useI18n()
  const [state, setState] = useState<AppState>(() => {
    const savedReturnTo = getReturnTo()
    if (savedReturnTo && (savedReturnTo.itemId !== null || savedReturnTo.seriesId !== null)) {
      clearReturnTo()
      return {
        authenticated: isAuthenticated(),
        selectedMenuId: 'home',
        itemId: savedReturnTo.itemId,
        seriesId: savedReturnTo.seriesId,
        focusArea: 'content',
        menuFocusIndex: 0,
        screenFocus: {},
        returnToItemId: null,
        returnToSeriesId: null,
        player: null
      }
    }
    return {
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
  })
  const [initializing, setInitializing] = useState(true)

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
    setState(prev => ({ ...prev, seriesId: null }))
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
      itemId: null
    }))
  }, [])

  const handleNavigateToMenu = useCallback(() => {
    setState(prev => ({ ...prev, focusArea: 'menu' }))
  }, [])

  const handleClosePlayer = useCallback(() => {
    setState(prev => ({ ...prev, player: null }))
  }, [])

  const handlePlay = useCallback(async (itemId: number, season?: number, episode?: number, options?: { quality?: string }) => {
    const localSettings = getLocalSettings()

    if (localSettings.playerType === 'native') {
      setState(prev => {
        saveReturnTo({ itemId: prev.itemId, seriesId: prev.seriesId })
        return {
          ...prev,
          returnToItemId: prev.itemId,
          returnToSeriesId: prev.seriesId
        }
      })
    }

    try {
      const item = await getItem(itemId)

      let files = item.videos?.[0]?.files
      let audios = item.videos?.[0]?.audios || []
      let subtitles = item.videos?.[0]?.subtitles || []
      let title = item.title

      if (season !== undefined && episode !== undefined && item.seasons) {
        const seasonData = item.seasons.find(s => s.number === season)
        const episodeData = seasonData?.episodes.find(e => e.number === episode)
        if (episodeData) {
          files = episodeData.files
          audios = episodeData.audios || []
          subtitles = episodeData.subtitles || []
          title = `${item.title} - S${season}E${episode}`
          if (episodeData.title) title += ` - ${episodeData.title}`
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

      const streamUrl = getStreamUrl(files || [], preferredQuality, streamingType)
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
            season,
            episode
          }
        }))
      } else {
        await launchNativePlayer({
          fullPath: streamUrl,
          fileName: title,
          thumbnail: item.posters?.medium
        })
      }
    } catch {
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const savedReturnTo = getReturnTo()
        setState(prev => {
          if (savedReturnTo && (savedReturnTo.itemId !== null || savedReturnTo.seriesId !== null)) {
            clearReturnTo()
            return {
              ...prev,
              itemId: savedReturnTo.itemId,
              seriesId: savedReturnTo.seriesId,
              returnToItemId: null,
              returnToSeriesId: null
            }
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
          case 38: // Up
            setState(prev => ({
              ...prev,
              menuFocusIndex: Math.max(0, prev.menuFocusIndex - 1)
            }))
            event.preventDefault()
            break

          case 40: // Down
            setState(prev => ({
              ...prev,
              menuFocusIndex: Math.min(ALL_MENU_ITEMS_COUNT - 1, prev.menuFocusIndex + 1)
            }))
            event.preventDefault()
            break

          case 39: // Right
            setState(prev => ({ ...prev, focusArea: 'content' }))
            event.preventDefault()
            break

          case 13: // Enter
            const menuId = getMenuIdByIndex(state.menuFocusIndex)
            if (menuId) {
              handleMenuSelect(menuId)
            }
            event.preventDefault()
            break

          case 461: // Back
            if (state.seriesId) {
              handleBackFromSeries()
            } else if (state.itemId) {
              handleBackFromItem()
            } else {
              handleLogout()
            }
            event.preventDefault()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.authenticated, state.focusArea, state.menuFocusIndex, state.itemId, state.seriesId, handleMenuSelect, handleLogout, handleBackFromItem, handleBackFromSeries])

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
        onBack={handleClosePlayer}
      />
    )
  }

  if (state.seriesId) {
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        <SideMenu
          selectedId={state.selectedMenuId}
          focusedIndex={state.focusArea === 'menu' ? state.menuFocusIndex : null}
          onSelect={handleMenuSelect}
        />
        <div class={`app-with-menu ${state.focusArea === 'menu' ? 'menu-expanded' : ''}`}>
          <SeasonsScreen
            itemId={state.seriesId}
            onBack={handleBackFromSeries}
            onPlay={handlePlay}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={state.focusArea === 'content'}
          />
        </div>
      </div>
    )
  }

  if (state.itemId) {
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        <SideMenu
          selectedId={state.selectedMenuId}
          focusedIndex={state.focusArea === 'menu' ? state.menuFocusIndex : null}
          onSelect={handleMenuSelect}
        />
        <div class={`app-with-menu ${state.focusArea === 'menu' ? 'menu-expanded' : ''}`}>
          <ItemScreen
            itemId={state.itemId}
            onBack={handleBackFromItem}
            onPlay={handlePlay}
            onSelectSeries={handleSelectSeries}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={state.focusArea === 'content'}
          />
        </div>
      </div>
    )
  }

  const renderContent = () => {
    const isContentActive = state.focusArea === 'content'

    switch (state.selectedMenuId) {
      case 'home':
        const homeFocus = state.screenFocus['home'] || { row: 0, col: 0 }
        return (
          <MainScreen
            onLogout={handleNavigateToMenu}
            onSelectItem={handleSelectItem}
            onNavigateToMenu={handleNavigateToMenu}
            isActive={isContentActive}
            initialFocusRow={homeFocus.row}
            initialFocusCol={homeFocus.col}
            onFocusChange={(row, col) => handleFocusChange('home', row, col)}
          />
        )
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
      default:
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

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <SideMenu
        selectedId={state.selectedMenuId}
        focusedIndex={state.focusArea === 'menu' ? state.menuFocusIndex : null}
        onSelect={handleMenuSelect}
      />
      <div class={`app-with-menu ${state.focusArea === 'menu' ? 'menu-expanded' : ''}`}>
        {renderContent()}
      </div>
    </div>
  )
}
