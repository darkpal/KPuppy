import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

const MAX_RETRIES = 3
const STALL_MS = 3500
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
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_kpuppy_retry=${retryRequestId}${hash}`
}

function reloadImage(img: HTMLImageElement, src: string): void {
  img.removeAttribute('src')
  void img.offsetWidth
  // A unique URL avoids reusing an incomplete in-memory response on webOS.
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

  const retryImage = useCallback((img: HTMLImageElement) => {
    if (retriesRef.current >= MAX_RETRIES) return
    retriesRef.current += 1
    if (revealWhenDecoded) setIsReady(false)
    reloadImage(img, baseSrc)
  }, [baseSrc, revealWhenDecoded])

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
        if (img.complete && img.naturalWidth > 0) return
        if (retriesRef.current >= MAX_RETRIES) return

        retryImage(img)
        scheduleStallCheck()
      }, STALL_MS)
    }

    scheduleStallCheck()

    return () => {
      disposed = true
      window.clearTimeout(timeoutId)
    }
  }, [baseSrc, retryImage])

  if (!baseSrc) return null

  return (
    <img
      ref={imgRef}
      src={baseSrc}
      alt={alt}
      class={`${className || ''}${revealWhenDecoded ? ` poster-image-${isReady ? 'ready' : 'loading'}` : ''}`}
      loading={loading}
      decoding={revealWhenDecoded ? 'sync' : 'async'}
      onLoad={(event) => {
        if (!revealWhenDecoded) return

        const img = event.currentTarget
        if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
          retryImage(img)
          return
        }

        const loadedSrc = img.src
        const decode = img.decode
        if (typeof decode !== 'function') {
          setIsReady(true)
          return
        }

        decode.call(img).then(() => {
          if (mountedRef.current && imgRef.current === img && img.src === loadedSrc) {
            setIsReady(true)
          }
        }).catch(() => {
          if (mountedRef.current && imgRef.current === img && img.src === loadedSrc) {
            retryImage(img)
          }
        })
      }}
      onError={(event) => {
        retryImage(event.currentTarget)
      }}
    />
  )
}
