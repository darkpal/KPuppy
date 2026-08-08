import type { Season } from '../api/kinopub'
import { WatchingStatus } from './watching'

export interface EpisodeNavigationTarget {
  season: number
  episode: number
}

export interface EpisodeNeighbors {
  previousEpisode?: EpisodeNavigationTarget
  nextEpisode?: EpisodeNavigationTarget
}

/** Lightweight season/episode list for the player episodes panel (no files/streams). */
export interface EpisodeSummary {
  number: number
  title: string
  duration?: number
  watched?: number
  watching?: { time?: number; status?: number }
}

export interface SeasonSummary {
  number: number
  episodes: EpisodeSummary[]
}

/** Strip media payloads; keep only list metadata for PlayerState. */
export function buildSeasonsSummary(
  seasons: Season[] | undefined
): SeasonSummary[] | undefined {
  if (!seasons || seasons.length === 0) return undefined

  const orderedSeasons = seasons.slice().sort((a, b) => a.number - b.number)
  return orderedSeasons.map(season => ({
    number: season.number,
    episodes: season.episodes.slice().sort((a, b) => a.number - b.number).map(episode => ({
      number: episode.number,
      title: episode.title,
      duration: episode.duration,
      watched: episode.watched,
      watching: episode.watching
        ? { time: episode.watching.time, status: episode.watching.status }
        : undefined
    }))
  }))
}

function isFinished(status?: number): boolean {
  return status === WatchingStatus.Watched
}

function isEpisodeFinished(
  episode: { watched?: number; watching?: { status?: number } },
  seasonWatched?: boolean
): boolean {
  if (seasonWatched) return true
  if (episode.watched === 1) return true
  return isFinished(episode.watching?.status)
}

function episodeHasProgress(episode: {
  watched?: number
  watching?: { status?: number; time?: number }
}): boolean {
  if (episode.watched === 1) return true
  if (isFinished(episode.watching?.status)) return true
  if ((episode.watching?.time ?? 0) > 0) return true
  if (episode.watching?.status === WatchingStatus.Watching) return true
  return false
}

export type ContinueAction =
  | { kind: 'start'; season: number; episode: number }
  | { kind: 'continue'; season: number; episode: number }
  | { kind: 'completed' }

/**
 * Primary CTA for a series card:
 * - start → nothing watched yet
 * - continue → first unfinished episode
 * - completed → every episode finished
 */
export function getContinueAction(
  seasons: Season[] | undefined
): ContinueAction | null {
  if (!seasons || seasons.length === 0) return null

  const orderedSeasons = seasons.slice().sort((a, b) => a.number - b.number)
  let hasProgress = false
  let firstUnfinished: EpisodeNavigationTarget | null = null

  for (const season of orderedSeasons) {
    const seasonWatched = isFinished(season.watching?.status)
    if (seasonWatched) hasProgress = true
    const orderedEpisodes = season.episodes.slice().sort((a, b) => a.number - b.number)
    for (const episode of orderedEpisodes) {
      if (episodeHasProgress(episode) || seasonWatched) hasProgress = true
      if (!isEpisodeFinished(episode, seasonWatched) && !firstUnfinished) {
        firstUnfinished = { season: season.number, episode: episode.number }
      }
    }
  }

  if (!firstUnfinished) return { kind: 'completed' }

  if (!hasProgress) {
    return { kind: 'start', season: firstUnfinished.season, episode: firstUnfinished.episode }
  }

  return { kind: 'continue', season: firstUnfinished.season, episode: firstUnfinished.episode }
}

/**
 * First unwatched (or in-progress) episode for Continue · SxEy.
 * Skips seasons/episodes with watching.status === 1; falls back to S1E1.
 * @deprecated Prefer getContinueAction for UI labels.
 */
export function getContinueEpisode(
  seasons: Season[] | undefined
): EpisodeNavigationTarget | null {
  const action = getContinueAction(seasons)
  if (!action) return null
  if (action.kind === 'completed') {
    const ordered = seasons!.slice().sort((a, b) => a.number - b.number)
    const first = ordered[0]
    const firstEp = first?.episodes.slice().sort((a, b) => a.number - b.number)[0]
    if (!first || !firstEp) return null
    return { season: first.number, episode: firstEp.number }
  }
  return { season: action.season, episode: action.episode }
}

/** Resolve adjacent episodes across season boundaries without mutating API data. */
export function getEpisodeNeighbors(
  seasons: Season[] | undefined,
  currentSeason?: number,
  currentEpisode?: number
): EpisodeNeighbors {
  if (!seasons || currentSeason === undefined || currentEpisode === undefined) return {}

  // webOS 3.x/4.x uses Chromium versions without Array.prototype.flatMap.
  const episodes: EpisodeNavigationTarget[] = []
  const orderedSeasons = seasons.slice().sort((a, b) => a.number - b.number)
  orderedSeasons.forEach(season => {
    const orderedEpisodes = season.episodes.slice().sort((a, b) => a.number - b.number)
    orderedEpisodes.forEach(episode => {
      episodes.push({ season: season.number, episode: episode.number })
    })
  })

  const currentIndex = episodes.findIndex(target => (
    target.season === currentSeason && target.episode === currentEpisode
  ))

  if (currentIndex < 0) return {}

  return {
    previousEpisode: currentIndex > 0 ? episodes[currentIndex - 1] : undefined,
    nextEpisode: currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : undefined
  }
}
