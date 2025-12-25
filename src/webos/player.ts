import { isWebOS, lunaRequest, LunaResponse } from './service'

export interface VideoPayload {
  fullPath: string
  fileName: string
  thumbnail?: string
  lastPlayPosition?: number
}

interface LaunchResponse extends LunaResponse {
  processId?: string
}

export async function launchNativePlayer(payload: VideoPayload): Promise<void> {
  if (!isWebOS()) {
    window.open(payload.fullPath, '_blank')
    return
  }

  const mediaPayload = [{
    fullPath: payload.fullPath,
    fileName: payload.fileName,
    thumbnail: payload.thumbnail || '',
    lastPlayPosition: payload.lastPlayPosition ?? -1,
    mediaType: 'VIDEO',
    deviceType: 'DMR',
    artist: '',
    album: '',
    subtitle: '',
    dlnaInfo: {
      flagVal: 4096,
      cleartextSize: '-1',
      contentLength: '-1',
      opVal: 1,
      protocolInfo: 'http-get:*:video/mp4:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
      duration: 0
    }
  }]

  await lunaRequest<LaunchResponse>(
    'luna://com.webos.applicationManager',
    'launch',
    {
      id: 'com.webos.app.photovideo',
      params: { payload: mediaPayload }
    }
  )
}

export function getStreamUrl(
  files: Array<{ quality: string; url: { http?: string; hls?: string; hls2?: string; hls4?: string } }>,
  preferredQuality?: string,
  streamingType?: string
): string | null {
  if (!files || files.length === 0) return null

  const qualityOrder = ['2160p', '1080p', '720p', '480p']

  let selectedFile = files[0]

  if (preferredQuality) {
    const preferred = files.find(f => f.quality === preferredQuality)
    if (preferred) selectedFile = preferred
  } else {
    for (const quality of qualityOrder) {
      const found = files.find(f => f.quality === quality)
      if (found) {
        selectedFile = found
        break
      }
    }
  }

  const url = selectedFile.url
  const type = streamingType?.toLowerCase() as keyof typeof url
  const fallbackOrder: (keyof typeof url)[] = ['hls4', 'hls2', 'hls', 'http']

  if (type && url[type]) return url[type]

  for (const key of fallbackOrder) {
    if (url[key]) return url[key]
  }

  return null
}
