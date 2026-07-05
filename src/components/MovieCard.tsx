import { MovieItem } from '../api/kinopub'
import '../styles/movie-card.css'

interface EpisodeInfo {
  season: number
  episode: number
  title: string
  thumbnail?: string
}

interface MovieCardProps {
  movie: MovieItem
  focused: boolean
  onSelect?: () => void
  episodeInfo?: EpisodeInfo
  badge?: string
}

function splitTitle(title: string): { primary: string; secondary?: string } {
  const separators = [' / ', ' / ']
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep)
      return { primary: parts[0], secondary: parts[1] }
    }
  }
  return { primary: title }
}

export function MovieCard({ movie, focused, onSelect, episodeInfo, badge }: MovieCardProps) {
  const { primary, secondary } = splitTitle(movie.title)

  const episodeBadge = badge || (episodeInfo ? `S${episodeInfo.season}E${episodeInfo.episode}` : null)
  const imageSrc = episodeInfo?.thumbnail || movie.posters?.medium || movie.posters?.big || movie.posters?.small

  return (
    <div class={`movie-card ${focused ? 'focused' : ''}`} onClick={onSelect}>
      <img
        src={imageSrc}
        alt={movie.title}
        class="movie-card-image"
      />
      {episodeBadge && <div class="movie-card-badge">{episodeBadge}</div>}
      <div class="movie-card-overlay">
        <div class="movie-card-title">{primary}</div>
        {secondary && <div class="movie-card-title-secondary">{secondary}</div>}
        {movie.year > 0 && <div class="movie-card-year">{movie.year}</div>}
      </div>
    </div>
  )
}
