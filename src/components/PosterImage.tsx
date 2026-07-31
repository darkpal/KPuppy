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
  /** Ignore tiny/corrupt frames (common when a list thumb is stretched as a banner). */
  minNaturalWidth?: number
  onReady?: () => void
  onFailed?: () => void
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

function isAcceptableFrame(img: HTMLImageElement, minNaturalWidth: number): boolean {
  return img.complete && img.naturalWidth >= minNaturalWidth
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
  revealWhenDecoded = false,
  minNaturalWidth = 1,
  onReady,
  onFailed
}: PosterImageProps) {
  const baseSrc = (src || '').trim()
  const imgRef = useRef<HTMLImageElement>(null)
  const retriesRef = useRef(0)
  const mountedRef = useRef(true)
  const onReadyRef = useRef(onReady)
  const onFailedRef = useRef(onFailed)
  onReadyRef.current = onReady
  onFailedRef.current = onFailed
  const [isReady, setIsReady] = useState(!revealWhenDecoded)

  const markReady = useCallback(() => {
    if (!mountedRef.current) return
    setIsReady(true)
    onReadyRef.current?.()
  }, [])

  const markFailed = useCallback(() => {
    if (!mountedRef.current) return
    if (revealWhenDecoded) setIsReady(false)
    onFailedRef.current?.()
  }, [revealWhenDecoded])

  const tryReveal = useCallback((img: HTMLImageElement | null) => {
    if (!img || !isAcceptableFrame(img, minNaturalWidth)) return false
    markReady()
    return true
  }, [markReady, minNaturalWidth])

  const retryImage = useCallback((img: HTMLImageElement) => {
    if (retriesRef.current >= MAX_RETRIES) {
      markFailed()
      return
    }
    retriesRef.current += 1
    if (revealWhenDecoded) setIsReady(false)
    reloadImage(img, baseSrc)
  }, [baseSrc, markFailed, revealWhenDecoded])

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

  // Cached images often complete before onLoad is attached (webOS especially).
  // Also re-check after paint so a focus/layout pass is not required to reveal.
  useEffect(() => {
    if (!baseSrc) return

    let disposed = false
    let timeoutId = 0
    let rafId = 0

    const checkNow = () => {
      if (disposed) return
      tryReveal(imgRef.current)
    }

    rafId = window.requestAnimationFrame(checkNow)
    // Second tick covers late decode without waiting for the stall timer.
    timeoutId = window.setTimeout(checkNow, 50)

    return () => {
      disposed = true
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [baseSrc, tryReveal])

  useEffect(() => {
    if (!baseSrc) return

    let disposed = false
    let timeoutId = 0

    const scheduleStallCheck = () => {
      timeoutId = window.setTimeout(() => {
        if (disposed) return

        const img = imgRef.current
        if (!img) return
        if (tryReveal(img)) return
        if (retriesRef.current >= MAX_RETRIES) {
          markFailed()
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
  }, [baseSrc, markFailed, retryImage, tryReveal])

  if (!baseSrc) return null

  const revealClass = revealWhenDecoded
    ? ` poster-image-${isReady ? 'ready' : 'loading'}`
    : ''

  return (
    <img
      ref={imgRef}
      src={baseSrc}
      alt={alt}
      class={`${className || ''}${revealClass}`}
      loading={loading}
      decoding="async"
      onLoad={(event) => {
        tryReveal(event.currentTarget)
      }}
      onError={(event) => {
        retryImage(event.currentTarget)
      }}
    />
  )
}
