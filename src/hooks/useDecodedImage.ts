import { useEffect, useState } from 'preact/hooks'

const SAFETY_TIMEOUT_MS = 15000
const RETRY_DELAY_MS = 1500
const MAX_RETRIES = 2

function decodeViaCanvas(image: HTMLImageElement): void {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    // drawImage forces a full synchronous decode into the browser image cache.
    canvas.getContext('2d')?.drawImage(image, 0, 0, 1, 1)
  } catch {
    // Corrupt image — reveal anyway, the dark banner background covers it.
  }
}

/**
 * Preload and fully decode an image off-DOM before it is shown.
 *
 * webOS (Chromium 38/53) rasterizes large JPEGs synchronously at paint time
 * and often drops that repaint entirely, so a freshly loaded hero image stays
 * invisible until the next input/layout pass (a button press). Decoding here
 * first means the eventual <img> mount paints instantly, and the state flip
 * itself provides the DOM invalidation the TV was missing.
 */
export function useDecodedImage(url: string | null): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    if (!url) return

    let disposed = false
    let retries = 0
    let img: HTMLImageElement | null = null
    let retryTimer = 0

    const finish = () => {
      if (disposed) return
      disposed = true
      setReady(true)
    }

    const start = () => {
      img = new Image()
      img.onload = () => {
        const loaded = img
        if (disposed || !loaded) return
        // decode() (Chrome 64+) is preferred; canvas draw covers webOS 3/4.
        if (typeof loaded.decode === 'function') {
          loaded.decode().then(finish).catch(() => {
            decodeViaCanvas(loaded)
            finish()
          })
        } else {
          decodeViaCanvas(loaded)
          finish()
        }
      }
      img.onerror = () => {
        if (disposed) return
        if (retries >= MAX_RETRIES) {
          finish()
          return
        }
        retries += 1
        retryTimer = window.setTimeout(start, RETRY_DELAY_MS)
      }
      img.src = url
    }

    start()
    // Never hold the spinner forever on very slow networks.
    const safetyTimer = window.setTimeout(finish, SAFETY_TIMEOUT_MS)

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

  return ready
}
