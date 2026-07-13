import { MovieItem } from '../api/kinopub'
import { useI18n, Language } from '../i18n'
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

/**
 * Kinopub titles are usually "Localized / Original".
 * Russian UI keeps the local name; other UI languages prefer the original.
 */
export function cardTitleForLanguage(title: string, language: Language): string {
  const idx = title.indexOf('/')
  if (idx < 0) return title.trim()
  const local = title.slice(0, idx).trim()
  const original = title.slice(idx + 1).trim()
  if (language === 'ru') return local || original
  return original || local
}

function qualityLabel(quality?: number): string | null {
  if (!quality || quality <= 0) return null
  if (quality >= 2160) return '4K'
  if (quality >= 720) return 'HD'
  return null
}

function formatRating(value: number): string {
  const n = Number(value) || 0
  return n > 0 ? n.toFixed(1) : '—'
}

export function MovieCard({ movie, focused, onSelect, onHover, episodeInfo, badge }: MovieCardProps) {
  const { language } = useI18n()
  const title = cardTitleForLanguage(movie.title, language)
  const episodeBadge = badge || (episodeInfo ? `S${episodeInfo.season}E${episodeInfo.episode}` : null)
  const imageSrc = episodeInfo?.thumbnail || movie.posters?.medium || movie.posters?.big || movie.posters?.small
  const showRatings = movie.imdbRating > 0 || movie.kinopoiskRating > 0 || movie.ratingPercentage > 0
  const quality = qualityLabel(movie.quality)

  return (
    <div
      class={`movie-card ${focused ? 'focused' : ''}`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <div class="movie-card-poster">
        <img
          src={imageSrc}
          alt={title}
          class="movie-card-image"
        />
        {quality && <div class="movie-card-quality">{quality}</div>}
        <div class="movie-card-top-right">
          {movie.year > 0 && <div class="movie-card-year-badge">{movie.year}</div>}
          {episodeBadge && <div class="movie-card-badge">{episodeBadge}</div>}
        </div>
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
      <div class="movie-card-info">
        <h3 class="movie-card-title">{title}</h3>
      </div>
    </div>
  )
}
