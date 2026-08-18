import { describe, it, expect } from 'vitest'
import type { Video } from '../../src/api/kinopub'
import {
  buildVideosSummary,
  findVideoByNumber,
  hasVideoVersions,
  isVideosSummary,
  pickDefaultVideo,
  videoVersionLabel
} from '../../src/utils/videoVersions'

function video(partial: Partial<Video> & Pick<Video, 'number'>): Video {
  return {
    id: partial.id ?? partial.number,
    title: '',
    files: [],
    audios: [],
    ...partial
  }
}

describe('videoVersions', () => {
  it('detects multiple movie versions', () => {
    expect(hasVideoVersions([video({ number: 1 })])).toBe(false)
    expect(hasVideoVersions([video({ number: 1 }), video({ number: 2 })])).toBe(true)
  })

  it('prefers a version with in-progress time', () => {
    const videos = [
      video({ number: 1, title: 'Director', watching: { time: 0, status: -1 } }),
      video({ number: 2, title: 'Theatrical', watching: { time: 400, status: 0 } })
    ]
    expect(pickDefaultVideo(videos)?.number).toBe(2)
  })

  it('falls back to the first version', () => {
    const videos = [
      video({ number: 1, title: 'Director' }),
      video({ number: 2, title: 'Theatrical' })
    ]
    expect(pickDefaultVideo(videos)?.number).toBe(1)
  })

  it('labels named and unnamed versions', () => {
    expect(videoVersionLabel({ number: 1, title: 'Режиссёрская версия' }, 'Version')).toBe('Режиссёрская версия')
    expect(videoVersionLabel({ number: 2, title: '  ' }, 'Version')).toBe('Version 2')
  })

  it('builds a season-0 summary for the player panel', () => {
    const summary = buildVideosSummary([
      video({ number: 2, title: 'Theatrical', duration: 100 }),
      video({ number: 1, title: 'Director', duration: 200 })
    ])
    expect(isVideosSummary(summary)).toBe(true)
    expect(summary?.[0].episodes.map(e => e.number)).toEqual([1, 2])
  })

  it('finds a version by number', () => {
    const videos = [video({ number: 1 }), video({ number: 2, title: 'B' })]
    expect(findVideoByNumber(videos, 2)?.title).toBe('B')
    expect(findVideoByNumber(videos, 9)?.number).toBe(1)
  })
})
