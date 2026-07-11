import { getDeviceInfo, updateDeviceSettings, DeviceSettings, SelectOption } from './api/kinopub'

const DEVICE_DEFAULTS_KEY = 'kpuppy_device_defaults_applied'

function findOptionId(options: SelectOption[], matchers: RegExp[]): number | undefined {
  for (const matcher of matchers) {
    const found = options.find(opt => matcher.test(opt.label.trim()))
    if (found) return found.id
  }
  return undefined
}

/** Preferred Kinopub device settings for a fresh webOS install (matches typical TV setup). */
export function buildPreferredDeviceSettings(settings: DeviceSettings): Record<string, number> {
  const preferred: Record<string, number> = {
    support4k: 1,
    supportHevc: 1,
    supportHdr: 1,
    supportSsl: 1,
    mixedPlaylist: 0,
  }

  const netherlandsId = findOptionId(settings.serverLocation || [], [
    /^нидерланды$/i,
    /^netherlands$/i,
    /\bnetherlands\b/i,
    /\bнидерланд/i,
  ])
  if (netherlandsId !== undefined) {
    preferred.serverLocation = netherlandsId
  }

  // Exact "HLS" — not HLS2 / HLS4
  const hlsId = findOptionId(settings.streamingType || [], [/^hls$/i])
  if (hlsId !== undefined) {
    preferred.streamingType = hlsId
  }

  return preferred
}

export function hasAppliedDeviceDefaults(): boolean {
  try {
    return localStorage.getItem(DEVICE_DEFAULTS_KEY) === '1'
  } catch {
    return true
  }
}

export function markDeviceDefaultsApplied(): void {
  try {
    localStorage.setItem(DEVICE_DEFAULTS_KEY, '1')
  } catch {
    // ignore quota / private mode
  }
}

/** Apply preferred device settings once per install after login. */
export async function applyPreferredDeviceDefaultsOnce(): Promise<void> {
  if (hasAppliedDeviceDefaults()) return

  const deviceInfo = await getDeviceInfo()
  const preferred = buildPreferredDeviceSettings(deviceInfo.settings)
  await updateDeviceSettings(deviceInfo.id, preferred)
  markDeviceDefaultsApplied()
}
