import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

const MAX_RETRIES = 3
const STALL_MS = 5000
let retryRequestId = 0

interface PosterImageProps {
  src?: string | null
  alt: string
  class?: string
  loading?: 'lazy' | 'eager'
  /** Keep large hero art hidden until the browser confirms it is fully decoded. */
  revealWhenDecoded?: boolean
}

function retrySource(src: string): string {
  retryRequestId += 1
  const hashIndex = src.indexOf('#')
  const hash = hashIndex >= 0 ? src.slice(hashIndex) : ''
  const url = hashIndex >= 0 ? src.slice(0, hashIndex) : src
  // Strip previous retry tokens so remounts can keep using a stable cacheable URL.
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
export function PosterImage({
  src,
  alt,
  class: className,
  loading = 'lazy',
  revealWhenDecoded = false
}: PosterImageProps) {
  const baseSrc = (src || '').trim()
  const imgRef = useRef<HTMLImageElement>(null)
  const retriesRef = useRef(0)
  const mountedRef = useRef(true)
  const [isReady, setIsReady] = useState(!revealWhenDecoded)

  const markReady = useCallback(() => {
    if (mountedRef.current) setIsReady(true)
  }, [])

  const retryImage = useCallback((img: HTMLImageElement) => {
    if (retriesRef.current >= MAX_RETRIES) {
      markReady()
      return
    }
    retriesRef.current += 1
    if (revealWhenDecoded) setIsReady(false)
    reloadImage(img, baseSrc)
  }, [baseSrc, markReady, revealWhenDecoded])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    retriesRef.current = 0
    if (revealWhenDecoded) setIsReady(false)
  }, [baseSrc, revealWhenDecoded])

  useEffect(() => {
    if (!baseSrc) return

    let disposed = false
    let timeoutId = 0

    const scheduleStallCheck = () => {
      timeoutId = window.setTimeout(() => {
        if (disposed) return

        const img = imgRef.current
        if (!img) return
        // Already painted successfully — do not cache-bust.
        if (img.complete && img.naturalWidth > 0) {
          if (revealWhenDecoded) markReady()
          return
        }
        if (retriesRef.current >= MAX_RETRIES) {
          markReady()
          return
        }

        retryImage(img)
        scheduleStallCheck()
      }, STALL_MS)
    }

    scheduleStallCheck()

    return () => {
      disposed = true
      window.clearTimeout(timeoutId)
    }
  }, [baseSrc, markReady, revealWhenDecoded, retryImage])

  if (!baseSrc) return null

  return (
    <img
      ref={imgRef}
      src={baseSrc}
      alt={alt}
      class={`${className || ''}${revealWhenDecoded ? ` poster-image-${isReady ? 'ready' : 'loading'}` : ''}`}
      loading={loading}
      decoding="async"
      onLoad={() => {
        if (revealWhenDecoded) markReady()
      }}
      onError={(event) => {
        retryImage(event.currentTarget)
      }}
    />
  )
}
