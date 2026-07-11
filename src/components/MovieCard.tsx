import { MovieItem } from '../api/kinopub'
import imdbIcon from '../assets/imdb.svg'
import kinopoiskIcon from '../assets/kinopoisk.svg'
import thumbUpIcon from '../assets/thumb-up.svg'
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
  onHover?: () => void
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

function formatRating(value: number): string {
  return value > 0 ? value.toFixed(1) : '—'
}

export function MovieCard({ movie, focused, onSelect, onHover, episodeInfo, badge }: MovieCardProps) {
  const { primary, secondary } = splitTitle(movie.title)

  const episodeBadge = badge || (episodeInfo ? `S${episodeInfo.season}E${episodeInfo.episode}` : null)
  const imageSrc = episodeInfo?.thumbnail || movie.posters?.medium || movie.posters?.big || movie.posters?.small
  const showRatings = movie.imdbRating > 0 || movie.kinopoiskRating > 0 || movie.ratingPercentage > 0

  return (
    <div
      class={`movie-card ${focused ? 'focused' : ''}`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <div class="movie-card-poster">
        <img
          src={imageSrc}
          alt={movie.title}
          class="movie-card-image"
        />
        {episodeBadge && <div class="movie-card-badge">{episodeBadge}</div>}
        {showRatings && (
          <div class="movie-card-ratings">
            <div class="movie-card-rating">
              <img src={imdbIcon} alt="IMDb" class="movie-card-rating-icon" />
              <span>{formatRating(movie.imdbRating)}</span>
            </div>
            <div class="movie-card-rating movie-card-rating-center">
              <img src={kinopoiskIcon} alt="KP" class="movie-card-rating-icon" />
              <span>{formatRating(movie.kinopoiskRating)}</span>
            </div>
            <div class="movie-card-rating movie-card-rating-end">
              <img src={thumbUpIcon} alt="" class="movie-card-rating-icon" />
              <span>{movie.ratingPercentage > 0 ? `${movie.ratingPercentage}%` : '—'}</span>
            </div>
          </div>
        )}
      </div>
      <div class="movie-card-caption">
        <div class="movie-card-title">{primary}</div>
        {secondary && <div class="movie-card-title-secondary">{secondary}</div>}
        {movie.year > 0 && <div class="movie-card-year">{movie.year}</div>}
      </div>
    </div>
  )
}
