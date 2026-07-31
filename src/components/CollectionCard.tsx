import { Collection } from '../api/kinopub'
import '../styles/collection-card.css'

interface CollectionCardProps {
  collection: Collection
  focused: boolean
  onSelect?: () => void
  onHover?: () => void
}

/** Up to 4 poster URLs for a 2×2 collage (API may send an array or a single composite). */
export function collectionPosterUrls(posters: Collection['posters'] | unknown): string[] {
  if (!posters) return []

  if (Array.isArray(posters)) {
    return posters
      .slice(0, 4)
      .map((p: { big?: string; medium?: string; small?: string }) => p?.big || p?.medium || p?.small || '')
      .filter(Boolean)
  }

  if (typeof posters === 'object') {
    const record = posters as Record<string, unknown>
    const indexed: string[] = []
    for (let i = 0; i < 4; i++) {
      const entry = record[String(i)] ?? record[i]
      if (entry && typeof entry === 'object') {
        const p = entry as { big?: string; medium?: string; small?: string }
        const url = p.big || p.medium || p.small
        if (url) indexed.push(url)
      } else if (typeof entry === 'string' && entry) {
        indexed.push(entry)
      }
    }
    if (indexed.length >= 2) return indexed.slice(0, 4)

    const single = (record.big || record.medium || record.small) as string | undefined
    if (single) return [single]
  }

  return []
}

export function CollectionCard({ collection, focused, onSelect, onHover }: CollectionCardProps) {
  const urls = collectionPosterUrls(collection.posters)
  const collage = urls.length >= 2

  return (
    <div
      class={`collection-card ${focused ? 'focused' : ''}`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <div class={`collection-card-poster ${collage ? 'is-collage' : ''}`}>
        {collage ? (
          <div class="collection-collage">
            {[0, 1, 2, 3].map(i => (
              <div key={i} class="collection-collage-cell">
                {urls[i] ? (
                  <img src={urls[i]} alt="" loading="lazy" />
                ) : (
                  <div class="collection-collage-empty" />
                )}
              </div>
            ))}
          </div>
        ) : urls[0] ? (
          <img src={urls[0]} alt={collection.title} class="collection-card-image" loading="lazy" />
        ) : (
          <div class="collection-card-placeholder" />
        )}
        {collection.count > 0 && (
          <div class="collection-card-count">{collection.count}</div>
        )}
      </div>
      <div class="collection-card-info">
        <h3 class="collection-card-title">{collection.title}</h3>
      </div>
    </div>
  )
}
