import { Audio, Subtitle, Person } from '../api/kinopub'
import { useI18n } from '../i18n'

interface ItemDetailsProps {
  countries?: string
  directors?: string
  actors?: Person[]
  audios: Audio[]
  subtitles: Subtitle[]
  focusedActorIndex?: number | null
  onHoverActor?: (index: number) => void
  onSelectActor?: (name: string) => void
}

function formatAudioLabel(audio: Audio): string {
  const parts: string[] = []
  if (audio.type) {
    parts.push(audio.type.short_title || audio.type.title)
  }
  if (audio.author?.title) {
    parts.push(audio.author.title)
  }
  if (audio.channels === 6) {
    parts.push('5.1')
  }
  return parts.join(' • ') || 'Audio'
}

function formatSubtitleLabel(sub: Subtitle): string {
  const langNames: Record<string, string> = {
    rus: 'Русский',
    eng: 'English',
    ukr: 'Українська',
    spa: 'Español',
    por: 'Português',
    deu: 'Deutsch',
    fra: 'Français',
  }
  return langNames[sub.lang] || sub.lang.toUpperCase()
}

export function ItemDetails({
  countries,
  directors,
  actors,
  audios,
  subtitles,
  focusedActorIndex = null,
  onHoverActor,
  onSelectActor
}: ItemDetailsProps) {
  const { t } = useI18n()
  const visibleActors = actors?.slice(0, 8) || []

  return (
    <div class="item-column-right">
      {countries && (
        <p class="item-detail">
          <span class="item-detail-label">{t.country}:</span>
          <span class="item-detail-value">{countries}</span>
        </p>
      )}
      {directors && (
        <p class="item-detail">
          <span class="item-detail-label">{t.director}:</span>
          <span class="item-detail-value">{directors}</span>
        </p>
      )}
      {visibleActors.length > 0 && (
        <div class="item-detail item-detail-cast">
          <span class="item-detail-label">{t.cast}:</span>
          <div class="item-cast-list">
            {visibleActors.map((actor, index) => (
              <button
                key={`${actor.id}-${actor.name}`}
                type="button"
                class={`item-chip ${focusedActorIndex === index ? 'focused' : ''}`}
                onMouseEnter={() => onHoverActor?.(index)}
                onClick={() => onSelectActor?.(actor.name)}
              >
                {actor.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {audios.length > 0 && (
        <p class="item-detail">
          <span class="item-detail-label">{t.audio}:</span>
          <span class="item-detail-value">
            {audios.map((audio, idx) => (
              <span key={audio.id}>
                {formatAudioLabel(audio)}
                {idx < audios.length - 1 && ', '}
              </span>
            ))}
          </span>
        </p>
      )}
      {subtitles.length > 0 && (
        <p class="item-detail">
          <span class="item-detail-label">{t.subtitles}:</span>
          <span class="item-detail-value">
            {subtitles.map((sub, idx) => (
              <span key={sub.lang}>
                {formatSubtitleLabel(sub)}
                {idx < subtitles.length - 1 && ', '}
              </span>
            ))}
          </span>
        </p>
      )}
    </div>
  )
}
