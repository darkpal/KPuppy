/**
 * MSE/hls.js for Live TV (and trailer) HLS playlists.
 * Uses the light build — IIFE packaging cannot code-split dynamic imports.
 */
import Hls from 'hls.js/dist/hls.light.mjs'

export function isHlsPlaylistUrl(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url)
}

/**
 * Live TV / trailers have no Kinopub multi-quality `files` list.
 * Native webOS HLS works for many channels; MSE is the fallback when it fails.
 */
export function shouldPreferMseHls(url: string, filesLength: number): boolean {
  return filesLength === 0 && isHlsPlaylistUrl(url) && Hls.isSupported()
}

/**
 * Seek forward into the first buffered range only when the playhead is still
 * before it (classic black screen at 0:00). Never pull the playhead backward
 * when it has reached the live edge — that freezes / loops short windows.
 */
export function seekIntoBuffered(video: HTMLMediaElement): boolean {
  const { buffered, currentTime } = video
  if (!buffered.length) return false
  const start = buffered.start(0)
  if (!Number.isFinite(start)) return false
  if (currentTime >= start - 0.05) return false
  try {
    video.currentTime = start + 0.1
    return true
  } catch {
    return false
  }
}

/** If live playback stalls at the buffer end, jump slightly behind the edge. */
export function recoverLiveEdge(video: HTMLMediaElement): boolean {
  const { buffered, currentTime } = video
  if (!buffered.length) return false
  const end = buffered.end(buffered.length - 1)
  const start = buffered.start(0)
  if (!Number.isFinite(end) || !Number.isFinite(start)) return false
  const nearEnd = currentTime >= end - 0.75
  const beforeBuffer = currentTime < start
  if (!nearEnd && !beforeBuffer) return false
  const target = Math.max(start, end - 1.5)
  if (Math.abs(currentTime - target) < 0.2) return false
  try {
    video.currentTime = target
    return true
  } catch {
    return false
  }
}

export function createLiveHls(): Hls {
  return new Hls({
    enableWorker: false,
    lowLatencyMode: false,
    startLevel: 0,
    testBandwidth: false,
    // Keep MediaSource duration infinite so the UI/player don't treat the
    // sliding live window (~20–40s) as a finished VOD that ends at 0:24.
    liveDurationInfinity: true,
    maxBufferLength: 40,
    maxMaxBufferLength: 80,
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 12,
    manifestLoadingMaxRetry: 6,
    levelLoadingMaxRetry: 6,
    fragLoadingMaxRetry: 6
  })
}

export { Hls }
