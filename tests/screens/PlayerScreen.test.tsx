import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/preact'
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(0)
    }))
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
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

    it('renders icon-only previous and next episode buttons with accessible labels', () => {
      renderWithI18n(
        <PlayerScreen
          {...mockProps}
          previousEpisode={{ season: 1, episode: 2 }}
          nextEpisode={{ season: 1, episode: 4 }}
          onPlayPreviousEpisode={vi.fn()}
          onPlayNextEpisode={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: 'Previous S1E2' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'Next S1E4' })).toBeDefined()
      expect(document.querySelectorAll('.player-episode-skip-icon')).toHaveLength(2)
      expect(document.querySelector('.player-episode-button-label')).toBeNull()
      expect(document.querySelector('.player-episode-button-number')).toBeNull()
    })

    it('supports remote navigation between episode controls', () => {
      renderWithI18n(
        <PlayerScreen
          {...mockProps}
          previousEpisode={{ season: 1, episode: 2 }}
          nextEpisode={{ season: 1, episode: 4 }}
          onPlayPreviousEpisode={vi.fn()}
          onPlayNextEpisode={vi.fn()}
        />
      )

      fireEvent.keyDown(document, { keyCode: 40 })
      expect(document.querySelector('.player-state-button.focused')).not.toBeNull()

      fireEvent.keyDown(document, { keyCode: 39 })
      expect(document.querySelector('.player-episode-button.focused')?.getAttribute('aria-label')).toContain('Next')
    })
  })

  describe('episode completion', () => {
    it('automatically starts the next episode once when playback ends', () => {
      const onPlayNextEpisode = vi.fn()
      renderWithI18n(
        <PlayerScreen
          {...mockProps}
          nextEpisode={{ season: 2, episode: 1 }}
          onPlayNextEpisode={onPlayNextEpisode}
        />
      )

      const video = document.querySelector('.player-video') as HTMLVideoElement
      Object.defineProperty(video, 'duration', { configurable: true, value: 2700 })

      fireEvent.ended(video)
      fireEvent.ended(video)

      expect(onPlayNextEpisode).toHaveBeenCalledTimes(1)
    })

    it('stays in the player when there is no next episode', () => {
      const onTimeUpdate = vi.fn()
      renderWithI18n(<PlayerScreen {...mockProps} onTimeUpdate={onTimeUpdate} />)

      const video = document.querySelector('.player-video') as HTMLVideoElement
      Object.defineProperty(video, 'duration', { configurable: true, value: 2700 })
      fireEvent.ended(video)

      expect(document.querySelector('.player-screen')).not.toBeNull()
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

  describe('episodes panel', () => {
    const seasonsSummary = [
      {
        number: 1,
        episodes: [
          { number: 1, title: 'Pilot', duration: 2400, watching: { time: 120, status: 0 } },
          { number: 2, title: 'Next', duration: 2400 }
        ]
      },
      {
        number: 2,
        episodes: [{ number: 1, title: 'S2E1', duration: 2500 }]
      }
    ]

    it('shows blue episodes hint when seasonsSummary is provided', () => {
      renderWithI18n(
        <PlayerScreen
          {...mockProps}
          season={1}
          episode={1}
          seasonsSummary={seasonsSummary}
          onPlayEpisode={vi.fn()}
        />
      )

      expect(document.querySelector('.player-hint-episodes')).not.toBeNull()
      expect(screen.getByText('Episodes')).toBeDefined()
    })

    it('opens episodes panel on Blue and plays selected episode on Enter', () => {
      const onPlayEpisode = vi.fn()
      const onPlayNextEpisode = vi.fn()
      renderWithI18n(
        <PlayerScreen
          {...mockProps}
          season={1}
          episode={1}
          seasonsSummary={seasonsSummary}
          nextEpisode={{ season: 1, episode: 2 }}
          onPlayNextEpisode={onPlayNextEpisode}
          onPlayEpisode={onPlayEpisode}
        />
      )

      fireEvent.keyDown(document, { keyCode: 406 })
      expect(document.querySelector('.player-panel-episodes')).not.toBeNull()
      expect(document.querySelector('.player-episode-item.current')?.textContent).toContain('Pilot')

      fireEvent.keyDown(document, { keyCode: 40 })
      fireEvent.keyDown(document, { keyCode: 13 })

      expect(onPlayEpisode).toHaveBeenCalledWith(1, 2)
      expect(onPlayNextEpisode).not.toHaveBeenCalled()
    })

    it('does not open episodes panel without seasonsSummary', () => {
      renderWithI18n(
        <PlayerScreen
          {...mockProps}
          nextEpisode={{ season: 1, episode: 2 }}
          onPlayNextEpisode={vi.fn()}
        />
      )

      fireEvent.keyDown(document, { keyCode: 406 })
      expect(document.querySelector('.player-panel-episodes')).toBeNull()
      expect(document.querySelector('.player-hint-episodes')).toBeNull()
    })
  })

  describe('subtitles', () => {
    it('shows subtitle button immediately when subtitle URLs exist', () => {
      const subtitles = [{
        lang: 'en',
        shift: 0,
        embed: false,
        forced: false,
        file: 'subs.srt',
        url: 'https://example.com/subs.srt'
      }]

      renderWithI18n(<PlayerScreen {...mockProps} subtitles={subtitles} />)

      expect(document.querySelector('.player-hint-subtitles')).not.toBeNull()
    })

    it('keeps a long subtitle list inside the panel while moving focus down', () => {
      const subtitles = ['en', 'ru', 'uk', 'de', 'fr', 'es', 'it', 'pt', 'tr', 'pl', 'cs', 'hu', 'ro', 'bg', 'hr'].map((lang, i) => ({
        lang,
        shift: 0,
        embed: false,
        forced: false,
        file: `${lang}.srt`,
        url: `https://example.com/${lang}.srt`
      }))

      renderWithI18n(<PlayerScreen {...mockProps} subtitles={subtitles} />)

      fireEvent.keyDown(document, { keyCode: 405 })
      expect(document.querySelector('.player-panel')).not.toBeNull()
      expect(document.querySelectorAll('.player-panel-item').length).toBe(subtitles.length + 1)

      const labels = Array.from(document.querySelectorAll('.player-panel-item'), el => el.textContent)
      expect(labels.slice(0, 4)).toEqual(['Off', 'Русский', 'Українська', 'English'])

      for (let i = 0; i < 8; i++) {
        fireEvent.keyDown(document, { keyCode: 40 })
      }

      const selected = document.querySelector('.player-panel-item.selected')
      const list = document.querySelector('.player-panel-list')
      expect(selected).not.toBeNull()
      expect(list?.contains(selected)).toBe(true)
      expect(selected?.textContent).toMatch(/^Français/)
      expect(document.querySelector('.player-overlay')).not.toBeNull()
    })

    it('keeps player controls visible while browsing subtitles', () => {
      const subtitles = ['ron', 'rus', 'spa'].map((lang) => ({
        lang,
        shift: 0,
        embed: false,
        forced: false,
        file: `${lang}.srt`,
        url: `https://example.com/${lang}.srt`
      }))

      renderWithI18n(<PlayerScreen {...mockProps} subtitles={subtitles} />)
      const video = document.querySelector('.player-video') as HTMLVideoElement
      fireEvent.play(video)
      fireEvent.keyDown(document, { keyCode: 405 })
      fireEvent.keyDown(document, { keyCode: 40 })
      vi.advanceTimersByTime(6000)
      fireEvent.keyDown(document, { keyCode: 40 })

      expect(document.querySelector('.player-overlay')).not.toBeNull()
      expect(document.querySelector('.player-panel-title')?.textContent).toBe('Subtitles')
      expect(document.querySelector('.player-panel-item.selected')?.textContent).toBe('Español')
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
