import { useState, useEffect, useMemo } from 'preact/hooks'
import { getItem, ItemDetails } from '../api/kinopub'
import { EpisodeRow } from '../components/EpisodeRow'
import { useKeyboardNavigation } from '../hooks'
import { useI18n } from '../i18n'
import '../styles/seasons.css'

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

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true)
        const data = await getItem(itemId)
        setItem(data)
      } catch (err) {
        console.error('Failed to load item:', err)
      } finally {
        setLoading(false)
      }
    }
    loadItem()
  }, [itemId])

  const seasons = item?.seasons || []
  const seriesPoster = item?.posters?.medium || item?.posters?.small

  const handlers = useMemo(() => {
    const currentSeason = seasons[focusedRow]
    const episodeCount = currentSeason?.episodes?.length || 0

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
      }
    }
  }, [seasons, focusedRow, focusedCol, itemId, onBack, onPlay, onNavigateToMenu])

  useKeyboardNavigation(handlers, isActive && !!item && seasons.length > 0)

  useEffect(() => {
    const rowElement = document.querySelector(`[data-season-row="${focusedRow}"]`) as HTMLElement
    const container = document.querySelector('.seasons-container') as HTMLElement
    if (rowElement && container) {
      const rowTop = rowElement.offsetTop
      const containerHeight = container.clientHeight
      const rowHeight = rowElement.clientHeight
      container.scrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2)
    }
  }, [focusedRow])

  if (loading) {
    return (
      <div class="seasons-screen">
        <div class="seasons-loading">
          <div class="seasons-spinner" />
        </div>
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

  return (
    <div class="seasons-screen">
      <div class="seasons-header">
        <h1 class="seasons-title">{item.title}</h1>
        <span class="seasons-subtitle">{seasons.length} {seasons.length > 1 ? t.seasons : t.season}</span>
      </div>

      <div class="seasons-container">
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
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
