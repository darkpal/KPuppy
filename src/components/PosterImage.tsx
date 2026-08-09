import { useEffect, useRef } from 'preact/hooks'

const MAX_RETRIES = 3
const STALL_MS = 5000
let retryRequestId = 0

interface PosterImageProps {
  src?: string | null
  /** Used after the primary URL fails (for example, a broken episode thumbnail). */
  fallbackSrc?: string | null
  alt: string
  class?: string
  loading?: 'lazy' | 'eager'
  /** Called only after the primary and fallback sources have both failed. */
  onFailure?: () => void
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
export function PosterImage({ src, fallbackSrc, alt, class: className, loading = 'lazy', onFailure }: PosterImageProps) {
  const baseSrc = (src || '').trim()
  const fallbackBaseSrc = (fallbackSrc || '').trim()
  const imgRef = useRef<HTMLImageElement>(null)
  const retriesRef = useRef(0)
  const activeSrcRef = useRef(baseSrc)
  const failureNotifiedRef = useRef(false)
  const onFailureRef = useRef(onFailure)
  onFailureRef.current = onFailure

  useEffect(() => {
    retriesRef.current = 0
    activeSrcRef.current = baseSrc
    failureNotifiedRef.current = false
  }, [baseSrc, fallbackBaseSrc])

  useEffect(() => {
    if (!baseSrc) return

    let disposed = false
    let timeoutId = 0

    const notifyFailure = () => {
      if (failureNotifiedRef.current) return
      failureNotifiedRef.current = true
      onFailureRef.current?.()
    }

    const switchToFallback = (img: HTMLImageElement) => {
      if (!fallbackBaseSrc || activeSrcRef.current === fallbackBaseSrc) return false
      activeSrcRef.current = fallbackBaseSrc
      retriesRef.current = 0
      reloadImage(img, fallbackBaseSrc)
      return true
    }

    const scheduleStallCheck = () => {
      timeoutId = window.setTimeout(() => {
        if (disposed) return

        const img = imgRef.current
        if (!img) return
        // Loaded fine — nothing to do.
        if (img.complete && img.naturalWidth > 0) return
        if (retriesRef.current >= MAX_RETRIES) {
          if (switchToFallback(img)) {
            scheduleStallCheck()
          } else {
            notifyFailure()
          }
          return
        }

        retriesRef.current += 1
        reloadImage(img, activeSrcRef.current)
        scheduleStallCheck()
      }, STALL_MS)
    }

    scheduleStallCheck()

    return () => {
      disposed = true
      window.clearTimeout(timeoutId)
    }
  }, [baseSrc, fallbackBaseSrc])

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
        const img = event.currentTarget
        if (retriesRef.current >= MAX_RETRIES) {
          // Preserve transient-error recovery for the episode image before
          // replacing a genuinely broken URL with the series poster.
          if (activeSrcRef.current === baseSrc && fallbackBaseSrc && fallbackBaseSrc !== baseSrc) {
            activeSrcRef.current = fallbackBaseSrc
            retriesRef.current = 0
            reloadImage(img, fallbackBaseSrc)
            return
          }
          if (!failureNotifiedRef.current) {
            failureNotifiedRef.current = true
            onFailureRef.current?.()
          }
          return
        }
        retriesRef.current += 1
        reloadImage(img, activeSrcRef.current)
      }}
    />
  )
}
