import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildPreferredDeviceSettings, hasAppliedDeviceDefaults, markDeviceDefaultsApplied, applyPreferredDeviceDefaultsOnce } from '../src/preferredDefaults'
import type { DeviceSettings } from '../src/api/kinopub'

vi.mock('../src/api/kinopub', () => ({
  getDeviceInfo: vi.fn(),
  updateDeviceSettings: vi.fn(),
}))

import { getDeviceInfo, updateDeviceSettings } from '../src/api/kinopub'

const baseSettings = (): DeviceSettings => ({
  support4k: 0,
  supportHevc: 0,
  supportHdr: 0,
  supportSsl: 0,
  mixedPlaylist: 1,
  serverLocation: [
    { id: 1, label: 'Germany', selected: 1 },
    { id: 2, label: 'Нидерланды', selected: 0 },
  ],
  streamingType: [
    { id: 10, label: 'HTTP', selected: 1 },
    { id: 11, label: 'HLS', selected: 0 },
    { id: 12, label: 'HLS4', selected: 0 },
  ],
})

describe('preferredDefaults', () => {
  beforeEach(() => {
    localStorage.removeItem('kpuppy_device_defaults_applied')
    vi.clearAllMocks()
  })

  it('builds toggles and picks Netherlands + classic HLS', () => {
    expect(buildPreferredDeviceSettings(baseSettings())).toEqual({
      support4k: 1,
      supportHevc: 1,
      supportHdr: 1,
      supportSsl: 1,
      mixedPlaylist: 0,
      serverLocation: 2,
      streamingType: 11,
    })
  })

  it('matches English Netherlands label', () => {
    const settings = baseSettings()
    settings.serverLocation = [{ id: 9, label: 'Netherlands', selected: 0 }]
    expect(buildPreferredDeviceSettings(settings).serverLocation).toBe(9)
  })

  it('skips server/stream when options missing', () => {
    expect(buildPreferredDeviceSettings({
      ...baseSettings(),
      serverLocation: [],
      streamingType: [],
    })).toEqual({
      support4k: 1,
      supportHevc: 1,
      supportHdr: 1,
      supportSsl: 1,
      mixedPlaylist: 0,
    })
  })

  it('applies once then skips', async () => {
    vi.mocked(getDeviceInfo).mockResolvedValue({ id: 42, settings: baseSettings() })
    vi.mocked(updateDeviceSettings).mockResolvedValue()

    await applyPreferredDeviceDefaultsOnce()
    await applyPreferredDeviceDefaultsOnce()

    expect(updateDeviceSettings).toHaveBeenCalledTimes(1)
    expect(updateDeviceSettings).toHaveBeenCalledWith(42, expect.objectContaining({
      support4k: 1,
      streamingType: 11,
      serverLocation: 2,
    }))
    expect(hasAppliedDeviceDefaults()).toBe(true)
  })

  it('respects already-applied marker', async () => {
    markDeviceDefaultsApplied()
    await applyPreferredDeviceDefaultsOnce()
    expect(getDeviceInfo).not.toHaveBeenCalled()
  })
})
