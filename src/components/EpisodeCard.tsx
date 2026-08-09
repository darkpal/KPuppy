import { useEffect, useState } from 'preact/hooks'
import { Episode } from '../api/kinopub'
import { PosterImage } from './PosterImage'

interface EpisodeCardProps {
  episode: Episode
  seriesPoster?: string
  focused: boolean
  onSelect?: () => void
  onHover?: () => void
}

export function EpisodeCard({ episode, seriesPoster, focused, onSelect, onHover }: EpisodeCardProps) {
  const episodeThumbnail = episode.thumbnail?.trim() || ''
  const fallbackPoster = seriesPoster?.trim() || ''
  const primaryImage = episodeThumbnail || fallbackPoster
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [episodeThumbnail, fallbackPoster])

  const formatDuration = (seconds?: number): string | null => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  const duration = formatDuration(episode.duration)

  const isWatched = episode.watched === 1 || episode.watching?.status === 1

  return (
    <div
      class={`episode-card ${focused ? 'focused' : ''} ${isWatched ? 'watched' : ''}`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <div class="episode-thumbnail">
        {primaryImage && !imageFailed ? (
          <PosterImage
            src={primaryImage}
            fallbackSrc={episodeThumbnail ? fallbackPoster : undefined}
            alt={episode.title}
            onFailure={() => setImageFailed(true)}
          />
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
