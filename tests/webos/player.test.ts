import { describe, it, expect } from 'vitest'
import { getStreamUrl, withHlsAudioIndex, getAvailableQualities } from '../../src/webos/player'

describe('player', () => {
  describe('getStreamUrl', () => {
    const mockFiles = [
      {
        quality: '480p',
        url: { http: 'http://480p', hls: 'https://480p.m3u8' }
      },
      {
        quality: '720p',
        url: { http: 'http://720p', hls: 'https://720p.m3u8', hls2: 'https://720p-hls2.m3u8' }
      },
      {
        quality: '1080p',
        url: { hls: 'https://1080p.m3u8', hls4: 'https://1080p-hls4.m3u8' }
      },
      {
        quality: '2160p',
        url: { hls4: 'https://4k-hls4.m3u8' }
      }
    ]

    it('returns null for empty files array', () => {
      expect(getStreamUrl([])).toBeNull()
    })

    it('returns null for undefined files', () => {
      expect(getStreamUrl(undefined as never)).toBeNull()
    })

    it('prefers 4K quality when available', () => {
      expect(getStreamUrl(mockFiles)).toBe('https://4k-hls4.m3u8')
    })

    it('falls back to lower quality when 4K unavailable', () => {
      const files = mockFiles.filter(f => f.quality !== '2160p')
      expect(getStreamUrl(files)).toBe('https://1080p-hls4.m3u8')
    })

    it('prefers hls4 over other formats', () => {
      expect(getStreamUrl([mockFiles[2]])).toBe('https://1080p-hls4.m3u8')
    })

    it('can prefer classic hls for builtin audio switching', () => {
      expect(getStreamUrl([mockFiles[2]], undefined, undefined, { preferClassicHls: true })).toBe('https://1080p.m3u8')
    })

    it('falls back to hls2 when hls4 unavailable', () => {
      expect(getStreamUrl([mockFiles[1]])).toBe('https://720p-hls2.m3u8')
    })

    it('falls back to hls when hls2 unavailable', () => {
      expect(getStreamUrl([mockFiles[0]])).toBe('https://480p.m3u8')
    })

    it('falls back to http when no hls available', () => {
      const httpOnly = [{ quality: '720p', url: { http: 'http://video.mp4' } }]
      expect(getStreamUrl(httpOnly)).toBe('http://video.mp4')
    })

    it('respects preferred quality parameter', () => {
      expect(getStreamUrl(mockFiles, '720p')).toBe('https://720p-hls2.m3u8')
    })

    it('falls back to first file for invalid preferred quality', () => {
      expect(getStreamUrl(mockFiles, '360p')).toBe('https://480p.m3u8')
    })
  })

  describe('getAvailableQualities', () => {
    it('returns ordered available qualities', () => {
      expect(getAvailableQualities([
        { quality: '720p' },
        { quality: '2160p' },
        { quality: '1080p' }
      ])).toEqual(['2160p', '1080p', '720p'])
    })
  })

  describe('withHlsAudioIndex', () => {
    it('rewrites master-v1aN segment', () => {
      expect(withHlsAudioIndex('https://cdn/master-v1a1.m3u8', 2)).toBe('https://cdn/master-v1a3.m3u8')
    })

    it('leaves unrelated urls unchanged', () => {
      expect(withHlsAudioIndex('https://cdn/hls4.m3u8', 1)).toBe('https://cdn/hls4.m3u8')
    })
  })
})
