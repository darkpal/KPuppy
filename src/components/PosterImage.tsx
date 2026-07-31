import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

const MAX_RETRIES = 3
const STALL_MS = 5000
const READY_POLL_MS = 100
const READY_POLL_MAX = 40
let retryRequestId = 0

interface PosterImageProps {
  src?: string | null
  alt: string
  class?: string
  loading?: 'lazy' | 'eager'
  /** Keep large hero art hidden until the browser confirms it is fully decoded. */
  revealWhenDecoded?: boolean
  /** Ignore empty/corrupt frames. Prefer 1 for banners — webOS often reports 0 until paint. */
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
  const readyRef = useRef(false)
  const mountedRef = useRef(true)
  const onReadyRef = useRef(onReady)
  const onFailedRef = useRef(onFailed)
  onReadyRef.current = onReady
  onFailedRef.current = onFailed
  const [isReady, setIsReady] = useState(!revealWhenDecoded)

  const markReady = useCallback(() => {
    if (!mountedRef.current || readyRef.current) return
    readyRef.current = true
    setIsReady(true)
    onReadyRef.current?.()
  }, [])

  const markFailed = useCallback(() => {
    if (!mountedRef.current) return
    if (revealWhenDecoded) setIsReady(false)
    onFailedRef.current?.()
  }, [revealWhenDecoded])

  const tryReveal = useCallback((img: HTMLImageElement | null) => {
    if (!img || readyRef.current) return readyRef.current
    if (!isAcceptableFrame(img, minNaturalWidth)) return false
    markReady()
    return true
  }, [markReady, minNaturalWidth])

  const retryImage = useCallback((img: HTMLImageElement) => {
    if (retriesRef.current >= MAX_RETRIES) {
      markFailed()
      return
    }
    retriesRef.current += 1
    readyRef.current = false
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
    readyRef.current = false
    if (revealWhenDecoded) setIsReady(false)
  }, [baseSrc, revealWhenDecoded])

  // webOS often skips onLoad for cached images and may leave naturalWidth at 0
  // until a later paint — poll instead of waiting for a focus remount.
  useEffect(() => {
    if (!baseSrc) return

    let disposed = false
    let polls = 0
    let rafId = 0
    let timeoutId = 0
    let intervalId = 0

    const checkNow = () => {
      if (disposed) return
      tryReveal(imgRef.current)
    }

    rafId = window.requestAnimationFrame(checkNow)
    timeoutId = window.setTimeout(checkNow, 0)
    intervalId = window.setInterval(() => {
      if (disposed) return
      if (tryReveal(imgRef.current)) {
        window.clearInterval(intervalId)
        return
      }
      polls += 1
      if (polls >= READY_POLL_MAX) window.clearInterval(intervalId)
    }, READY_POLL_MS)

    return () => {
      disposed = true
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [baseSrc, tryReveal])

  useEffect(() => {
    if (!baseSrc) return

    let disposed = false
    let timeoutId = 0

    const scheduleStallCheck = () => {
      timeoutId = window.setTimeout(() => {
        if (disposed || readyRef.current) return

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
        const img = event.currentTarget
        const finish = () => tryReveal(img)
        if (typeof img.decode === 'function') {
          img.decode().then(finish).catch(finish)
        } else {
          finish()
        }
      }}
      onError={(event) => {
        retryImage(event.currentTarget)
      }}
    />
  )
}
