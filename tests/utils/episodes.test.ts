import { describe, expect, it } from 'vitest'
import type { Season } from '../../src/api/kinopub'
import { buildSeasonsSummary, getContinueAction, getContinueEpisode, getEpisodeNeighbors } from '../../src/utils/episodes'

function episode(id: number, number: number, watching?: { status?: number; time?: number }, extras?: { title?: string; duration?: number; watched?: number }) {
  return {
    id,
    number,
    title: extras?.title ?? `Episode ${number}`,
    duration: extras?.duration,
    files: [],
    audios: [],
    watched: extras?.watched ?? (watching?.status === 1 ? 1 : 0),
    watching
  }
}

describe('getContinueAction', () => {
  it('returns null without seasons', () => {
    expect(getContinueAction(undefined)).toBeNull()
    expect(getContinueAction([])).toBeNull()
  })

  it('starts watching at S1E1 when nothing watched', () => {
    const seasons: Season[] = [
      { number: 1, episodes: [episode(1, 1), episode(2, 2)] },
      { number: 2, episodes: [episode(3, 1)] }
    ]
    expect(getContinueAction(seasons)).toEqual({ kind: 'start', season: 1, episode: 1 })
  })

  it('continues at first unfinished episode', () => {
    const seasons: Season[] = [
      {
        number: 1,
        episodes: [
          episode(1, 1, { status: 1 }),
          episode(2, 2, { status: 0, time: 120 })
        ]
      }
    ]
    expect(getContinueAction(seasons)).toEqual({ kind: 'continue', season: 1, episode: 2 })
  })

  it('treats watched=1 as finished', () => {
    const seasons: Season[] = [
      {
        number: 1,
        episodes: [
          episode(1, 1, undefined, { watched: 1 }),
          episode(2, 2)
        ]
      }
    ]
    expect(getContinueAction(seasons)).toEqual({ kind: 'continue', season: 1, episode: 2 })
  })

  it('returns completed when every episode is finished', () => {
    const seasons: Season[] = [
      {
        number: 1,
        watching: { status: 1 },
        episodes: [episode(1, 1, { status: 1 })]
      }
    ]
    expect(getContinueAction(seasons)).toEqual({ kind: 'completed' })
  })
})

describe('getContinueEpisode', () => {
  it('returns null without seasons', () => {
    expect(getContinueEpisode(undefined)).toBeNull()
    expect(getContinueEpisode([])).toBeNull()
  })

  it('starts at S1E1 when nothing watched', () => {
    const seasons: Season[] = [
      { number: 1, episodes: [episode(1, 1), episode(2, 2)] },
      { number: 2, episodes: [episode(3, 1)] }
    ]
    expect(getContinueEpisode(seasons)).toEqual({ season: 1, episode: 1 })
  })

  it('skips finished episodes and seasons', () => {
    const seasons: Season[] = [
      {
        number: 1,
        watching: { status: 1 },
        episodes: [episode(1, 1, { status: 1 }), episode(2, 2, { status: 1 })]
      },
      {
        number: 2,
        episodes: [
          episode(3, 1, { status: 1 }),
          episode(4, 2, { status: 0, time: 120 }),
          episode(5, 3)
        ]
      }
    ]
    expect(getContinueEpisode(seasons)).toEqual({ season: 2, episode: 2 })
  })

  it('falls back to S1E1 when everything is finished', () => {
    const seasons: Season[] = [
      {
        number: 1,
        watching: { status: 1 },
        episodes: [episode(1, 1, { status: 1 })]
      }
    ]
    expect(getContinueEpisode(seasons)).toEqual({ season: 1, episode: 1 })
  })
})

describe('getEpisodeNeighbors', () => {
  const seasons: Season[] = [
    { number: 2, episodes: [episode(4, 2), episode(3, 1)] },
    { number: 1, episodes: [episode(2, 2), episode(1, 1)] }
  ]

  it('finds adjacent episodes in numeric order', () => {
    expect(getEpisodeNeighbors(seasons, 1, 2)).toEqual({
      previousEpisode: { season: 1, episode: 1 },
      nextEpisode: { season: 2, episode: 1 }
    })
  })

  it('omits previous or next at the ends of the series', () => {
    expect(getEpisodeNeighbors(seasons, 1, 1)).toEqual({
      previousEpisode: undefined,
      nextEpisode: { season: 1, episode: 2 }
    })
    expect(getEpisodeNeighbors(seasons, 2, 2)).toEqual({
      previousEpisode: { season: 2, episode: 1 },
      nextEpisode: undefined
    })
  })

  it('returns no navigation for movies or missing episodes', () => {
    expect(getEpisodeNeighbors(undefined, 1, 1)).toEqual({})
    expect(getEpisodeNeighbors(seasons, 3, 1)).toEqual({})
  })

  it('works on older webOS Chromium without Array.prototype.flatMap', () => {
    const originalFlatMap = Array.prototype.flatMap
    Object.defineProperty(Array.prototype, 'flatMap', {
      configurable: true,
      value: undefined
    })

    try {
      expect(getEpisodeNeighbors(seasons, 1, 2).nextEpisode).toEqual({ season: 2, episode: 1 })
    } finally {
      Object.defineProperty(Array.prototype, 'flatMap', {
        configurable: true,
        value: originalFlatMap
      })
    }
  })
})

describe('buildSeasonsSummary', () => {
  it('returns undefined without seasons', () => {
    expect(buildSeasonsSummary(undefined)).toBeUndefined()
    expect(buildSeasonsSummary([])).toBeUndefined()
  })

  it('keeps light metadata and drops media payloads', () => {
    const seasons: Season[] = [
      {
        number: 2,
        episodes: [
          {
            id: 20,
            number: 1,
            title: 'Later',
            duration: 1800,
            files: [{ quality: '1080p', url: { hls: 'https://x.m3u8' } }],
            audios: [],
            watched: 0,
            watching: { status: 0, time: 90 }
          }
        ]
      },
      {
        number: 1,
        episodes: [
          episode(2, 2, undefined, { title: 'Second', duration: 2400, watched: 1 }),
          episode(1, 1, { status: 0, time: 12 }, { title: 'First', duration: 2100 })
        ]
      }
    ]

    expect(buildSeasonsSummary(seasons)).toEqual([
      {
        number: 1,
        episodes: [
          {
            number: 1,
            title: 'First',
            duration: 2100,
            watched: 0,
            watching: { status: 0, time: 12 }
          },
          {
            number: 2,
            title: 'Second',
            duration: 2400,
            watched: 1,
            watching: undefined
          }
        ]
      },
      {
        number: 2,
        episodes: [
          {
            number: 1,
            title: 'Later',
            duration: 1800,
            watched: 0,
            watching: { status: 0, time: 90 }
          }
        ]
      }
    ])
  })
})
