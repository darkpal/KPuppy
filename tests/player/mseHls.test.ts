import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('hls.js/dist/hls.light.mjs', () => {
  const Hls = vi.fn(function MockHls(this: { on: ReturnType<typeof vi.fn> }) {
    this.on = vi.fn()
  })
  ;(Hls as unknown as { isSupported: () => boolean }).isSupported = vi.fn(() => true)
  ;(Hls as unknown as { Events: Record<string, string> }).Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError'
  }
  ;(Hls as unknown as { ErrorTypes: Record<string, string> }).ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError'
  }
  return { default: Hls }
})

import Hls from 'hls.js/dist/hls.light.mjs'
import { createLiveHls, isHlsPlaylistUrl, shouldUseMseHls } from '../../src/player/mseHls'

describe('mseHls', () => {
  beforeEach(() => {
    vi.mocked(Hls.isSupported).mockReturnValue(true)
  })

  it('detects HLS playlist URLs', () => {
    expect(isHlsPlaylistUrl('https://edge/index.m3u8')).toBe(true)
    expect(isHlsPlaylistUrl('https://edge/index.m3u8?token=abc')).toBe(true)
    expect(isHlsPlaylistUrl('https://edge/video.mp4')).toBe(false)
  })

  it('uses MSE only for live-style streams without VOD files', () => {
    expect(shouldUseMseHls('https://edge/index.m3u8', 0)).toBe(true)
    expect(shouldUseMseHls('https://edge/index.m3u8', 2)).toBe(false)
    expect(shouldUseMseHls('https://edge/video.mp4', 0)).toBe(false)
  })

  it('skips MSE when Hls.isSupported is false', () => {
    vi.mocked(Hls.isSupported).mockReturnValue(false)
    expect(shouldUseMseHls('https://edge/index.m3u8', 0)).toBe(false)
  })

  it('creates an HLS instance with workers disabled', () => {
    createLiveHls()
    expect(Hls).toHaveBeenCalledWith(expect.objectContaining({
      enableWorker: false,
      lowLatencyMode: true
    }))
  })
})
