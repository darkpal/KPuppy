import { useEffect, useState } from 'preact/hooks'

const SAFETY_TIMEOUT_MS = 15000
const RETRY_DELAY_MS = 1500
const MAX_RETRIES = 2

/**
 * Preload an image off-DOM and report when it is safe to show.
 *
 * webOS drops the repaint that should follow a large hero image finishing its
 * load, so an <img> mounted before the data arrived stays invisible until the
 * next input/layout pass (a button press). Mounting the element only after
 * onload turns the reveal into a DOM mutation, which reliably schedules the
 * frame the TV was missing.
 *
 * Where img.decode() exists (Chrome 64+) we also pre-rasterize off the main
 * thread so that frame paints instantly. Older engines get no forced decode:
 * a synchronous canvas decode here wedged the webOS renderer for good under
 * memory pressure (frozen spinner, dead timers).
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
        if (typeof loaded.decode === 'function') {
          loaded.decode().then(finish).catch(finish)
        } else {
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
