import type { Video } from '../api/kinopub'
import { WatchingStatus } from './watching'
import type { SeasonSummary } from './episodes'

/** Movies with theatrical / director's cuts expose several `videos[]` entries. */
export function hasVideoVersions(videos?: Video[] | null): boolean {
  return (videos?.length ?? 0) > 1
}

export function pickDefaultVideo(videos?: Video[] | null): Video | undefined {
  if (!videos || videos.length === 0) return undefined
  const inProgress = videos.find(video => {
    if (video.watching?.status === WatchingStatus.Watched) return false
    return (video.watching?.time ?? 0) > 0
  })
  return inProgress || videos[0]
}

export function findVideoByNumber(videos: Video[] | undefined, number: number | undefined): Video | undefined {
  if (!videos || videos.length === 0) return undefined
  if (number == null) return pickDefaultVideo(videos)
  return videos.find(video => video.number === number) || pickDefaultVideo(videos)
}

export function videoVersionLabel(video: Pick<Video, 'number' | 'title'>, unnamed: string): string {
  const title = (video.title || '').trim()
  return title || `${unnamed} ${video.number}`
}

/** Reuse the player episodes panel: a single synthetic season 0. */
export function buildVideosSummary(videos?: Video[] | null): SeasonSummary[] | undefined {
  if (!hasVideoVersions(videos)) return undefined
  const ordered = videos!.slice().sort((a, b) => a.number - b.number)
  return [{
    number: 0,
    episodes: ordered.map(video => ({
      number: video.number,
      title: video.title,
      duration: video.duration,
      watched: video.watched,
      watching: video.watching
        ? { time: video.watching.time, status: video.watching.status }
        : undefined
    }))
  }]
}

export function isVideosSummary(summary?: SeasonSummary[] | null): boolean {
  return Boolean(summary && summary.length === 1 && summary[0].number === 0)
}
