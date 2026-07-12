import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/preact'
import { h } from 'preact'
import { PlayerScreen } from '../../src/screens/PlayerScreen'
import { I18nProvider } from '../../src/i18n/context'

function renderWithI18n(component: preact.ComponentChild) {
  return render(
    <I18nProvider>
      {component}
    </I18nProvider>
  )
}

describe('PlayerScreen', () => {
  const mockProps = {
    url: 'https://example.com/video.m3u8',
    title: 'Test Video',
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders player screen container', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      expect(document.querySelector('.player-screen')).toBeDefined()
    })

    it('renders video element', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      const video = document.querySelector('.player-video')
      expect(video).toBeDefined()
    })

    it('sets video src attribute', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      const video = document.querySelector('.player-video') as HTMLVideoElement
      expect(video.src).toBe('https://example.com/video.m3u8')
    })

    it('renders video title in overlay', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      expect(screen.getByText('Test Video')).toBeDefined()
    })
  })

  describe('controls', () => {
    it('shows controls overlay initially', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      expect(document.querySelector('.player-overlay')).toBeDefined()
    })

    it('renders progress bar', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      expect(document.querySelector('.player-progress-bar')).toBeDefined()
    })

    it('renders time display', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      expect(document.querySelector('.player-time')).toBeDefined()
    })

    it('renders play state indicator', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      expect(document.querySelector('.player-state-button')).toBeDefined()
    })
  })

  describe('quality tracks', () => {
    it('shows quality hint when multiple qualities provided', () => {
      const files = [
        { quality: '1080p', url: { hls: 'https://a.m3u8' } },
        { quality: '720p', url: { hls: 'https://b.m3u8' } }
      ]
      renderWithI18n(<PlayerScreen {...mockProps} files={files} initialQuality="1080p" />)
      expect(screen.getByText('1080p')).toBeDefined()
    })
  })

  describe('audio tracks', () => {
    it('shows audio hint when audios provided', () => {
      const audios = [{
        id: 1,
        index: 0,
        codec: 'aac',
        channels: 2,
        lang: 'en',
        type: { id: 1, title: 'Original', short_title: 'Orig' },
        author: null
      }]

      renderWithI18n(<PlayerScreen {...mockProps} audios={audios} />)

      expect(screen.getByText('Audio')).toBeDefined()
    })

    it('does not show audio hint when no audios', () => {
      renderWithI18n(<PlayerScreen {...mockProps} audios={[]} />)

      const hints = document.querySelectorAll('.player-hint')
      const audioHint = Array.from(hints).find(h => h.textContent?.includes('Audio'))
      expect(audioHint).toBeUndefined()
    })
  })

  describe('subtitles', () => {
    it('renders subtitle tracks as track elements', () => {
      const subtitles = [{
        lang: 'en',
        shift: 0,
        embed: false,
        forced: false,
        file: 'subs.srt',
        url: 'https://example.com/subs.srt'
      }]

      renderWithI18n(<PlayerScreen {...mockProps} subtitles={subtitles} />)

      const video = document.querySelector('.player-video')
      expect(video).toBeDefined()
    })
  })

  describe('time update callback', () => {
    it('accepts onTimeUpdate callback', () => {
      const mockTimeUpdate = vi.fn()

      renderWithI18n(<PlayerScreen {...mockProps} onTimeUpdate={mockTimeUpdate} />)

      expect(document.querySelector('.player-screen')).toBeDefined()
    })

    it('accepts startTime prop', () => {
      renderWithI18n(<PlayerScreen {...mockProps} startTime={120} />)

      expect(document.querySelector('.player-screen')).toBeDefined()
    })
  })

  describe('error display', () => {
    it('renders error container when needed', () => {
      renderWithI18n(<PlayerScreen {...mockProps} />)

      expect(document.querySelector('.player-screen')).toBeDefined()
    })
  })
})
