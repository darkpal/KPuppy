import { Audio, Subtitle, Person } from '../api/kinopub'
import { useI18n } from '../i18n'

interface ItemDetailsProps {
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
  const code = (sub.lang || '').toLowerCase()
  const langNames: Record<string, string> = {
    rus: 'Русский',
    ru: 'Русский',
    eng: 'English',
    en: 'English',
    ukr: 'Українська',
    uk: 'Українська',
    tur: 'Türkçe',
    tr: 'Türkçe',
    spa: 'Español',
    es: 'Español',
    deu: 'Deutsch',
    de: 'Deutsch',
    fra: 'Français',
    fr: 'Français',
    ita: 'Italiano',
    it: 'Italiano',
    por: 'Português',
    pt: 'Português',
    pol: 'Polski',
    pl: 'Polski',
    jpn: '日本語',
    ja: '日本語',
    chi: '中文',
    zh: '中文',
    kor: '한국어',
    ko: '한국어',
  }
  const name = langNames[code] || (sub.lang || '').toUpperCase()
  return sub.forced ? `${name} (forced)` : name
}

export function ItemDetails({
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
  const visibleActors = actors?.slice(0, 6) || []
  const visibleDirectors = directors?.slice(0, 3) || []

  return (
    <div class="item-column-right">
      {(countries || visibleDirectors.length > 0) && (
        <div class="item-detail-meta-row">
          {countries && (
            <p class="item-detail item-detail-inline-text">
              <span class="item-detail-label">{t.country}:</span>
              <span class="item-detail-value">{countries}</span>
            </p>
          )}
          {visibleDirectors.length > 0 && (
            <div class="item-detail item-detail-inline">
              <span class="item-detail-label">{t.director}:</span>
              <div class="item-cast-list">
                {visibleDirectors.map((director) => (
                  <button
                    key={`dir-${director.id}-${director.name}`}
                    type="button"
                    class="item-chip"
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
            {audios.slice(0, 4).map((audio, idx, list) => (
              <span key={audio.id}>
                {formatAudioLabel(audio)}
                {idx < list.length - 1 && ', '}
              </span>
            ))}
            {audios.length > 4 && ` +${audios.length - 4}`}
          </span>
        </p>
      )}
      {subtitles.length > 0 && (
        <p class="item-detail">
          <span class="item-detail-label">{t.subtitles}:</span>
          <span class="item-detail-value">
            {subtitles.slice(0, 6).map((sub, idx, list) => (
              <span key={`${sub.lang}-${sub.forced ? 'f' : 'n'}-${idx}`}>
                {formatSubtitleLabel(sub)}
                {idx < list.length - 1 && ', '}
              </span>
            ))}
            {subtitles.length > 6 && ` +${subtitles.length - 6}`}
          </span>
        </p>
      )}
    </div>
  )
}
