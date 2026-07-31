import { useEffect, useState } from 'preact/hooks'

const SAFETY_TIMEOUT_MS = 15000
const RETRY_DELAY_MS = 1500
const MAX_RETRIES = 2

export interface DecodedImageState {
  /** The fully loaded image element, or null if the load failed / timed out. */
  image: HTMLImageElement | null
  /** True once the spinner can be dropped (loaded, failed, or timed out). */
  ready: boolean
}

/**
 * Preload an image off-DOM and report when it is safe to show.
 *
 * The webOS compositor cannot rasterize very large source bitmaps: the frame
 * containing them never activates and the screen freezes on the previous
 * frame until real input forces a redraw. So the banner never mounts the raw
 * <img> — the caller draws the loaded image downscaled onto a screen-sized
 * canvas instead, which the TV composites without trouble.
 *
 * Where img.decode() exists (Chrome 64+) the bitmap is also decoded off the
 * main thread here, so the later canvas draw is cheap.
 */
export function useDecodedImage(url: string | null): DecodedImageState {
  const [state, setState] = useState<DecodedImageState>({ image: null, ready: false })

  useEffect(() => {
    setState({ image: null, ready: false })
    if (!url) return

    let disposed = false
    let retries = 0
    let img: HTMLImageElement | null = null
    let retryTimer = 0

    const finish = (image: HTMLImageElement | null) => {
      if (disposed) return
      disposed = true
      setState({ image, ready: true })
    }

    const start = () => {
      img = new Image()
      img.onload = () => {
        const loaded = img
        if (disposed || !loaded) return
        if (typeof loaded.decode === 'function') {
          loaded.decode().then(() => finish(loaded)).catch(() => finish(loaded))
        } else {
          finish(loaded)
        }
      }
      img.onerror = () => {
        if (disposed) return
        if (retries >= MAX_RETRIES) {
          finish(null)
          return
        }
        retries += 1
        retryTimer = window.setTimeout(start, RETRY_DELAY_MS)
      }
      img.src = url
    }

    start()
    // Never hold the spinner forever on very slow networks.
    const safetyTimer = window.setTimeout(() => finish(null), SAFETY_TIMEOUT_MS)

    return () => {
      disposed = true
      window.clearTimeout(safetyTimer)
      window.clearTimeout(retryTimer)
      if (img) {
        img.onload = null
        img.onerror = null
      }
    }
  }, [url])

  return state
}
