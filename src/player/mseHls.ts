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
 * Prefer MSE there — webOS native HLS often rejects playlists that
 * desktop browsers (via hls.js/MSE) play fine.
 */
export function shouldUseMseHls(url: string, filesLength: number): boolean {
  return filesLength === 0 && isHlsPlaylistUrl(url) && Hls.isSupported()
}

export function createLiveHls(): Hls {
  return new Hls({
    // Web Workers are flaky on older webOS Chromium builds.
    enableWorker: false,
    lowLatencyMode: true,
    maxBufferLength: 30,
    maxMaxBufferLength: 60
  })
}

export { Hls }
