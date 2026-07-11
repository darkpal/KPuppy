import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks'
import { getItem, toggleWatched, ItemDetails } from '../api/kinopub'
import { EpisodeRow } from '../components/EpisodeRow'
import { EpisodeCard } from '../components/EpisodeCard'
import { VirtualGrid } from '../components/VirtualGrid'
import { useKeyboardNavigation, useScrollToFocused, useGridLayout, createGridNavigationHandlers } from '../hooks'
import { LoadingState } from '../components/LoadingSpinner'
import { useI18n } from '../i18n'
import '../styles/seasons.css'
import '../styles/category.css'

interface SeasonsScreenProps {
  itemId: number
  onBack: () => void
  onPlay: (itemId: number, season: number, episode: number) => void
  onNavigateToMenu: () => void
  isActive: boolean
}

export function SeasonsScreen({ itemId, onBack, onPlay, onNavigateToMenu, isActive }: SeasonsScreenProps) {
  const { t } = useI18n()
  const [item, setItem] = useState<ItemDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [focusedRow, setFocusedRow] = useState(0)
  const [focusedCol, setFocusedCol] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true)
        const data = await getItem(itemId)
        setItem(data)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load item:', err)
      } finally {
        setLoading(false)
      }
    }
    loadItem()
  }, [itemId])

  const seasons = item?.seasons || []
  const seriesPoster = item?.posters?.medium || item?.posters?.small
  const isGridMode = seasons.length > 0 && seasons.length <= 2
  const { itemsPerRow: episodesPerRow, cardWidth: episodeCardWidth } = useGridLayout('.seasons-episode-grid', 240, [isGridMode, seasons.length])

  const handleToggleWatched = useCallback(async () => {
    const currentSeason = seasons[focusedRow]
    const episode = currentSeason?.episodes?.[focusedCol]
    if (!episode || !item) return

    try {
      await toggleWatched({ id: item.id, season: currentSeason.number, video: episode.number })
      setItem(prev => {
        if (!prev || !prev.seasons) return prev
        return {
          ...prev,
          seasons: prev.seasons.map((s, sIdx) => {
            if (sIdx !== focusedRow) return s
            return {
              ...s,
              episodes: s.episodes.map((ep, eIdx) => {
                if (eIdx !== focusedCol) return ep
                return { ...ep, watched: ep.watched === 1 ? 0 : 1 }
              })
            }
          })
        }
      })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to toggle watched:', err)
    }
  }, [seasons, focusedRow, focusedCol, item])

  const handlers = useMemo(() => {
    const currentSeason = seasons[focusedRow]
    const episodeCount = currentSeason?.episodes?.length || 0

    if (isGridMode) {
      return {
        ...createGridNavigationHandlers({
          itemCount: episodeCount,
          itemsPerRow: episodesPerRow,
          focusedIndex: focusedCol,
          setFocusedIndex: setFocusedCol,
          onSelect: (index) => {
            const episode = currentSeason?.episodes?.[index]
            if (episode) {
              onPlay(itemId, currentSeason.number, episode.number)
            }
          },
          onLeftEdge: onNavigateToMenu,
          onTopEdge: focusedRow > 0
            ? () => {
                const prevCount = seasons[focusedRow - 1]?.episodes?.length || 0
                const col = focusedCol % episodesPerRow
                const lastRowStart = Math.floor(Math.max(0, prevCount - 1) / episodesPerRow) * episodesPerRow
                setFocusedRow(focusedRow - 1)
                setFocusedCol(Math.min(lastRowStart + col, Math.max(0, prevCount - 1)))
              }
            : undefined,
          onBottomEdge: focusedRow < seasons.length - 1
            ? () => {
                const nextCount = seasons[focusedRow + 1]?.episodes?.length || 0
                const col = focusedCol % episodesPerRow
                setFocusedRow(focusedRow + 1)
                setFocusedCol(Math.min(col, Math.max(0, nextCount - 1)))
              }
            : undefined
        }),
        onBack,
        onYellow: handleToggleWatched
      }
    }

    return {
      onBack,
      onLeft: () => {
        if (focusedCol > 0) {
          setFocusedCol(prev => prev - 1)
        } else {
          onNavigateToMenu()
        }
      },
      onRight: () => {
        if (focusedCol < episodeCount - 1) {
          setFocusedCol(prev => prev + 1)
        }
      },
      onUp: () => {
        if (focusedRow > 0) {
          const newRow = focusedRow - 1
          const newRowEpisodeCount = seasons[newRow]?.episodes?.length || 0
          setFocusedRow(newRow)
          setFocusedCol(prev => Math.min(prev, newRowEpisodeCount - 1))
        }
      },
      onDown: () => {
        if (focusedRow < seasons.length - 1) {
          const newRow = focusedRow + 1
          const newRowEpisodeCount = seasons[newRow]?.episodes?.length || 0
          setFocusedRow(newRow)
          setFocusedCol(prev => Math.min(prev, Math.max(0, newRowEpisodeCount - 1)))
        }
      },
      onEnter: () => {
        const episode = currentSeason?.episodes?.[focusedCol]
        if (episode) {
          onPlay(itemId, currentSeason.number, episode.number)
        }
      },
      onYellow: handleToggleWatched
    }
  }, [seasons, focusedRow, focusedCol, itemId, onBack, onPlay, onNavigateToMenu, handleToggleWatched, isGridMode, episodesPerRow])

  useKeyboardNavigation(handlers, isActive && !!item && seasons.length > 0)

  useScrollToFocused({
    containerRef,
    focusedIndex: focusedRow,
    itemSelector: '[data-season-row]',
    itemCount: seasons.length
  })

  if (loading) {
    return (
      <div class="seasons-screen">
        <LoadingState />
      </div>
    )
  }

  if (!item || seasons.length === 0) {
    return (
      <div class="seasons-screen">
        <div class="seasons-empty">{t.noSeasonsAvailable}</div>
      </div>
    )
  }

  if (isGridMode) {
    return (
      <div class="category-screen">
        <div class="seasons-header">
          <h1 class="seasons-title">{item.title}</h1>
          <span class="seasons-subtitle">
            {seasons.length === 1 ? `${t.season} ${seasons[0].number}` : `${seasons.length} ${t.seasons}`}
          </span>
        </div>
        {seasons.map((season, seasonIndex) => (
          <div key={season.number}>
            {seasons.length > 1 && (
              <h2 class="history-section-title">{t.season} {season.number}</h2>
            )}
            <VirtualGrid
              items={season.episodes}
              focusedIndex={focusedRow === seasonIndex ? focusedCol : -1}
              itemsPerRow={episodesPerRow}
              renderItem={(episode, index, focused) => (
                <EpisodeCard
                  episode={episode}
                  seriesPoster={seriesPoster}
                  focused={focused}
                  onSelect={() => {
                    setFocusedRow(seasonIndex)
                    setFocusedCol(index)
                    onPlay(itemId, season.number, episode.number)
                  }}
                />
              )}
              getItemKey={(episode) => episode.id}
              containerClass="category-grid seasons-episode-grid"
              cardWidth={episodeCardWidth}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div class="seasons-screen">
      <div class="seasons-header">
        <h1 class="seasons-title">{item.title}</h1>
        <span class="seasons-subtitle">{seasons.length} {seasons.length > 1 ? t.seasons : t.season}</span>
      </div>

      <div class="seasons-container" ref={containerRef}>
        {seasons.map((season, rowIndex) => (
          <div key={season.number} data-season-row={rowIndex}>
            <EpisodeRow
              title={`${t.season} ${season.number}`}
              episodes={season.episodes}
              seriesPoster={seriesPoster}
              focusedIndex={rowIndex === focusedRow ? focusedCol : null}
              onSelect={(colIndex) => {
                setFocusedRow(rowIndex)
                setFocusedCol(colIndex)
                const episode = season.episodes[colIndex]
                if (episode) {
                  onPlay(itemId, season.number, episode.number)
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
