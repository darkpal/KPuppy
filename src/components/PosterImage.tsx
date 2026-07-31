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
  /** Ignore empty/corrupt frames when revealing. */
  minNaturalWidth?: number
  /**
   * When false, never clear/reassign src on a stall timer.
   * Banner art on webOS can load fine but report naturalWidth 0 until a later
   * paint — clearing src there makes the poster appear only after focus moves.
   */
  retryOnStall?: boolean
  /** Force a composite/paint pass after load (webOS often needs this). */
  forcePaintOnLoad?: boolean
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

/** webOS Chromium often decodes the bitmap but skips compositing until a layout. */
function forcePaint(img: HTMLImageElement): void {
  const previous = img.style.transform
  img.style.transform = 'translateZ(0)'
  void img.offsetWidth
  img.style.opacity = '0.999'
  void img.offsetHeight
  img.style.opacity = ''
  img.style.transform = previous
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
  retryOnStall = true,
  forcePaintOnLoad = false,
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

  const markReady = useCallback((img?: HTMLImageElement | null) => {
    if (!mountedRef.current || readyRef.current) return
    readyRef.current = true
    if (forcePaintOnLoad && img) forcePaint(img)
    setIsReady(true)
    onReadyRef.current?.()
  }, [forcePaintOnLoad])

  const markFailed = useCallback(() => {
    if (!mountedRef.current) return
    if (revealWhenDecoded) setIsReady(false)
    onFailedRef.current?.()
  }, [revealWhenDecoded])

  const tryReveal = useCallback((img: HTMLImageElement | null) => {
    if (!img || readyRef.current) return readyRef.current
    if (!isAcceptableFrame(img, minNaturalWidth)) return false
    markReady(img)
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

  useEffect(() => {
    if (!baseSrc) return

    let disposed = false
    let rafId = 0
    let timeoutId = 0

    const checkNow = () => {
      if (disposed) return
      const img = imgRef.current
      if (tryReveal(img)) return
      // Even without naturalWidth, force a paint pass so webOS may composite.
      if (forcePaintOnLoad && img) forcePaint(img)
    }

    rafId = window.requestAnimationFrame(() => {
      checkNow()
      rafId = window.requestAnimationFrame(checkNow)
    })
    timeoutId = window.setTimeout(checkNow, 0)

    return () => {
      disposed = true
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [baseSrc, forcePaintOnLoad, tryReveal])

  useEffect(() => {
    if (!baseSrc || !retryOnStall) return

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
  }, [baseSrc, markFailed, retryImage, retryOnStall, tryReveal])

  // Banner path: never clear src; if the frame is complete, keep nudging paint
  // until the TV actually composites (focus used to do this accidentally).
  useEffect(() => {
    if (!baseSrc || retryOnStall || !forcePaintOnLoad) return

    let disposed = false
    let ticks = 0
    const id = window.setInterval(() => {
      if (disposed) return
      const img = imgRef.current
      if (!img) return
      if (tryReveal(img)) {
        window.clearInterval(id)
        return
      }
      forcePaint(img)
      ticks += 1
      if (ticks >= 30) window.clearInterval(id)
    }, 200)

    return () => {
      disposed = true
      window.clearInterval(id)
    }
  }, [baseSrc, forcePaintOnLoad, retryOnStall, tryReveal])

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
        const finish = () => {
          if (!tryReveal(img) && forcePaintOnLoad) {
            forcePaint(img)
            // Accept the frame even if naturalWidth is still 0 on webOS.
            markReady(img)
          }
        }
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
