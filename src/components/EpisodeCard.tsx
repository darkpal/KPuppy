import { Episode } from '../api/kinopub'

interface EpisodeCardProps {
  episode: Episode
  seriesPoster?: string
  focused: boolean
  onSelect?: () => void
}

export function EpisodeCard({ episode, seriesPoster, focused, onSelect }: EpisodeCardProps) {
  const thumbnailUrl = episode.thumbnail || seriesPoster

  const formatDuration = (seconds?: number): string | null => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  const duration = formatDuration(episode.duration)

  const isWatched = episode.watched === 1

  return (
    <div
      class={`episode-card ${focused ? 'focused' : ''} ${isWatched ? 'watched' : ''}`}
      onClick={onSelect}
    >
      <div class="episode-thumbnail">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={episode.title} loading="lazy" />
        ) : (
          <div class="episode-placeholder">
            <span class="episode-placeholder-number">{episode.number}</span>
          </div>
        )}
        {duration && <span class="episode-duration">{duration}</span>}
        {isWatched && <span class="episode-watched-badge">✓</span>}
      </div>
      <div class="episode-info">
        <span class="episode-number">Episode {episode.number}</span>
        <span class="episode-title">{episode.title || `Episode ${episode.number}`}</span>
      </div>
    </div>
  )
}
