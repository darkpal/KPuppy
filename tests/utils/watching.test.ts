import { describe, it, expect } from 'vitest'
import { getResumeTime, mergeResumeTime, WatchingStatus } from '../../src/utils/watching'

describe('getResumeTime', () => {
  it('returns 0 when no watching info', () => {
    expect(getResumeTime()).toBe(0)
    expect(getResumeTime(null)).toBe(0)
    expect(getResumeTime({ time: 0 })).toBe(0)
  })

  it('returns watching time when in progress', () => {
    expect(getResumeTime({ status: WatchingStatus.Watching, time: 125 })).toBe(125)
  })

  it('returns 0 when marked watched', () => {
    expect(getResumeTime({ status: WatchingStatus.Watched, time: 125 })).toBe(0)
  })

  it('returns 0 when near the end', () => {
    expect(getResumeTime({ status: WatchingStatus.Watching, time: 3590 }, 3600)).toBe(0)
  })

  it('keeps time when far from the end', () => {
    expect(getResumeTime({ status: WatchingStatus.Watching, time: 100 }, 3600)).toBe(100)
  })
})

describe('mergeResumeTime', () => {
  it('prefers a later local snapshot over stale server time', () => {
    expect(mergeResumeTime({ status: WatchingStatus.Watching, time: 120 }, 480, 3600)).toBe(480)
  })

  it('keeps server time when it is ahead of local', () => {
    expect(mergeResumeTime({ status: WatchingStatus.Watching, time: 500 }, 120, 3600)).toBe(500)
  })

  it('ignores local progress when Kinopub marked the item watched', () => {
    expect(mergeResumeTime({ status: WatchingStatus.Watched, time: 3500 }, 3480, 3600)).toBe(0)
  })
})
