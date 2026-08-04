import { Audio, Subtitle, Person } from '../api/kinopub'
import { getAudioTrackName } from '../storage'
import { useI18n } from '../i18n'
import { summarizeSubtitleTracks } from '../utils/subtitles'

interface ItemDetailsProps {
  className?: string
  maxActors?: number
  countries?: string
  directors?: Person[]
  actors?: Person[]
  audios?: Audio[]
  subtitles?: Subtitle[]
  focusedActorIndex?: number | null
  onHoverActor?: (index: number) => void
  onSelectActor?: (name: string) => void
  onSelectDirector?: (name: string) => void
}

export function ItemDetails({
  className,
  maxActors,
  countries,
  directors,
  actors,
  audios = [],
  subtitles = [],
  focusedActorIndex = null,
  onHoverActor,
  onSelectActor,
  onSelectDirector
}: ItemDetailsProps) {
  const { t } = useI18n()
  const visibleActors = maxActors === undefined ? (actors || []) : (actors?.slice(0, maxActors) || [])
  const visibleDirectors = directors?.slice(0, 3) || []
  const visibleAudios = audios.slice(0, 6)

  return (
    <div class={`item-details-content ${className || ''}`}>
      {(countries || visibleDirectors.length > 0) && (
        <div class="item-detail-topline">
          {countries && (
            <p class="item-detail item-detail-country">
              <span class="item-detail-label">{t.country}:</span>
              <span class="item-detail-value">{countries}</span>
            </p>
          )}
          {visibleDirectors.length > 0 && (
            <div class="item-detail item-detail-inline item-detail-director">
              <span class="item-detail-label">{t.director}:</span>
              <div class="item-cast-list">
                {visibleDirectors.map((director) => (
                  <button
                    key={`dir-${director.id}-${director.name}`}
                    type="button"
                    class="item-person-chip"
                    onClick={() => onSelectDirector?.(director.name)}
                  >
                    {director.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {visibleActors.length > 0 && (
        <div class="item-detail item-detail-inline">
          <span class="item-detail-label">{t.cast}:</span>
          <div class="item-cast-list">
            {visibleActors.map((actor, index) => (
              <button
                key={`${actor.id}-${actor.name}`}
                type="button"
                class={`item-person-chip ${focusedActorIndex === index ? 'focused' : ''}`}
                onMouseEnter={() => onHoverActor?.(index)}
                onClick={() => onSelectActor?.(actor.name)}
              >
                {actor.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {visibleAudios.length > 0 && (
        <div class="item-detail item-detail-block">
          <span class="item-detail-label">{t.audio}:</span>
          <div class="item-detail-list">
            {visibleAudios.map((audio, index) => (
              <span key={audio.id} class="item-detail-list-item">
                {getAudioTrackName(audio)}
                {index === visibleAudios.length - 1 && audios.length > visibleAudios.length && (
                  <span class="item-detail-more">+{audios.length - visibleAudios.length}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      {subtitles.length > 0 && (
        <p class="item-detail">
          <span class="item-detail-label">{t.subtitles}:</span>
          <span class="item-detail-value">{summarizeSubtitleTracks(subtitles)}</span>
        </p>
      )}
    </div>
  )
}
