import { useEffect, useRef } from 'preact/hooks'

const MAX_RETRIES = 2
const STALL_MS = 3500

interface PosterImageProps {
  src?: string | null
  alt: string
  class?: string
  loading?: 'lazy' | 'eager'
}

function reloadImage(img: HTMLImageElement, src: string): void {
  img.removeAttribute('src')
  void img.offsetWidth
  img.src = src
}

/**
 * Poster image with retries for aborted / stalled loads (common on webOS when
 * many cards mount at once or VirtualGrid unmounts mid-download).
 */
export function PosterImage({
  src,
  alt,
  class: className,
  loading = 'lazy'
}: PosterImageProps) {
  const baseSrc = (src || '').trim()
  const imgRef = useRef<HTMLImageElement>(null)
  const retriesRef = useRef(0)

  useEffect(() => {
    retriesRef.current = 0
  }, [baseSrc])

  useEffect(() => {
    if (!baseSrc) return

    const id = window.setTimeout(() => {
      const img = imgRef.current
      if (!img) return
      if (img.complete && img.naturalWidth > 0) return
      if (retriesRef.current >= MAX_RETRIES) return
      retriesRef.current += 1
      reloadImage(img, baseSrc)
    }, STALL_MS)

    return () => window.clearTimeout(id)
  }, [baseSrc])

  if (!baseSrc) return null

  return (
    <img
      ref={imgRef}
      src={baseSrc}
      alt={alt}
      class={className}
      loading={loading}
      decoding="async"
      onError={(event) => {
        if (retriesRef.current >= MAX_RETRIES) return
        retriesRef.current += 1
        reloadImage(event.currentTarget, baseSrc)
      }}
    />
  )
}
