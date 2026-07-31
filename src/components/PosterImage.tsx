import { useEffect, useRef } from 'preact/hooks'

const MAX_RETRIES = 3
const STALL_MS = 5000
let retryRequestId = 0

interface PosterImageProps {
  src?: string | null
  alt: string
  class?: string
  loading?: 'lazy' | 'eager'
}

function retrySource(src: string): string {
  retryRequestId += 1
  const hashIndex = src.indexOf('#')
  const hash = hashIndex >= 0 ? src.slice(hashIndex) : ''
  const url = hashIndex >= 0 ? src.slice(0, hashIndex) : src
  const cleanUrl = url.replace(/([?&])_kpuppy_retry=\d+/g, '$1').replace(/[?&]$/, '').replace(/\?&/, '?')
  const separator = cleanUrl.includes('?') ? '&' : '?'
  return `${cleanUrl}${separator}_kpuppy_retry=${retryRequestId}${hash}`
}

function reloadImage(img: HTMLImageElement, src: string): void {
  img.removeAttribute('src')
  void img.offsetWidth
  img.src = retrySource(src)
}

/**
 * Poster image with retries for aborted / stalled loads (common on webOS when
 * many cards mount at once or VirtualGrid unmounts mid-download).
 */
export function PosterImage({ src, alt, class: className, loading = 'lazy' }: PosterImageProps) {
  const baseSrc = (src || '').trim()
  const imgRef = useRef<HTMLImageElement>(null)
  const retriesRef = useRef(0)

  useEffect(() => {
    retriesRef.current = 0
  }, [baseSrc])

  useEffect(() => {
    if (!baseSrc) return

    let disposed = false
    let timeoutId = 0

    const scheduleStallCheck = () => {
      timeoutId = window.setTimeout(() => {
        if (disposed) return

        const img = imgRef.current
        if (!img) return
        // Loaded fine (or still has retries pending) — nothing to do.
        if (img.complete && img.naturalWidth > 0) return
        if (retriesRef.current >= MAX_RETRIES) return

        retriesRef.current += 1
        reloadImage(img, baseSrc)
        scheduleStallCheck()
      }, STALL_MS)
    }

    scheduleStallCheck()

    return () => {
      disposed = true
      window.clearTimeout(timeoutId)
    }
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
