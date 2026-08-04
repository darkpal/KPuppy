import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('hls.js/dist/hls.light.mjs', () => {
  const Hls = vi.fn(function MockHls(this: { on: ReturnType<typeof vi.fn> }) {
    this.on = vi.fn()
  })
  ;(Hls as unknown as { isSupported: () => boolean }).isSupported = vi.fn(() => true)
  ;(Hls as unknown as { Events: Record<string, string> }).Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    FRAG_BUFFERED: 'hlsFragBuffered',
    ERROR: 'hlsError'
  }
  ;(Hls as unknown as { ErrorTypes: Record<string, string> }).ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError'
  }
  return { default: Hls }
})

import Hls from 'hls.js/dist/hls.light.mjs'
import {
  collectLiveHlsDiagnostics,
  createLiveHls,
  isHlsPlaylistUrl,
  isLivePlaybackStalled,
  recoverLiveEdge,
  seekIntoBuffered,
  shouldPreferMseHls
} from '../../src/player/mseHls'

describe('mseHls', () => {
  beforeEach(() => {
    vi.mocked(Hls.isSupported).mockReturnValue(true)
  })

  it('detects HLS playlist URLs', () => {
    expect(isHlsPlaylistUrl('https://edge/index.m3u8')).toBe(true)
    expect(isHlsPlaylistUrl('https://edge/index.m3u8?token=abc')).toBe(true)
    expect(isHlsPlaylistUrl('https://edge/video.mp4')).toBe(false)
  })

  it('offers MSE for live-style streams without VOD files', () => {
    expect(shouldPreferMseHls('https://edge/index.m3u8', 0)).toBe(true)
    expect(shouldPreferMseHls('https://edge/index.m3u8', 2)).toBe(false)
    expect(shouldPreferMseHls('https://edge/video.mp4', 0)).toBe(false)
  })

  it('skips MSE when Hls.isSupported is false', () => {
    vi.mocked(Hls.isSupported).mockReturnValue(false)
    expect(shouldPreferMseHls('https://edge/index.m3u8', 0)).toBe(false)
  })

  it('creates an HLS instance tuned for webOS live', () => {
    createLiveHls()
    expect(Hls).toHaveBeenCalledWith(expect.objectContaining({
      enableWorker: false,
      lowLatencyMode: false,
      startLevel: 0,
      liveDurationInfinity: true
    }))
  })

  it('seeks forward into buffer only when playhead is still before it', () => {
    const video = {
      currentTime: 0,
      buffered: {
        length: 1,
        start: () => 1200,
        end: () => 1230
      }
    } as unknown as HTMLMediaElement

    expect(seekIntoBuffered(video)).toBe(true)
    expect(video.currentTime).toBeCloseTo(1200.1)
  })

  it('does not pull playhead backward near the live edge', () => {
    const video = {
      currentTime: 1229.5,
      buffered: {
        length: 1,
        start: () => 1200,
        end: () => 1230
      }
    } as unknown as HTMLMediaElement

    expect(seekIntoBuffered(video)).toBe(false)
    expect(video.currentTime).toBe(1229.5)
  })

  it('recovers a stall at the buffer end by jumping behind the live edge', () => {
    const video = {
      currentTime: 1229.8,
      buffered: {
        length: 1,
        start: () => 1200,
        end: () => 1230
      }
    } as unknown as HTMLMediaElement

    expect(recoverLiveEdge(video)).toBe(true)
    expect(video.currentTime).toBeCloseTo(1228.5)
  })

  it('detects stalled live playback', () => {
    expect(isLivePlaybackStalled({
      videoWidth: 0,
      currentTime: 0
    } as HTMLVideoElement)).toBe(true)
    expect(isLivePlaybackStalled({
      videoWidth: 1920,
      currentTime: 2
    } as HTMLVideoElement)).toBe(false)
  })

  it('builds readable live diagnostics lines', () => {
    const hls = {
      levels: [{
        height: 720,
        videoCodec: 'avc1.4d401f',
        audioCodec: 'mp4a.40.2',
        attrs: { CODECS: 'avc1.4d401f,mp4a.40.2' }
      }],
      currentLevel: 0,
      autoLevelEnabled: true
    } as unknown as InstanceType<typeof Hls>
    const video = {
      videoWidth: 0,
      videoHeight: 0,
      currentTime: 0,
      paused: true,
      buffered: { length: 0 },
      error: null
    } as unknown as HTMLVideoElement

    const lines = collectLiveHlsDiagnostics(hls, video, {
      lastError: 'warn mediaError: bufferAppendError',
      url: 'https://edge/fox/index.m3u8?token=abc'
    })

    expect(lines[0]).toMatch(/Native webOS HLS rejected/)
    expect(lines.some(line => line.includes('0×0'))).toBe(true)
    expect(lines.some(line => line.includes('720p'))).toBe(true)
    expect(lines.some(line => line.includes('bufferAppendError'))).toBe(true)
    expect(lines.some(line => line.includes('fox/index.m3u8'))).toBe(true)
  })
})
