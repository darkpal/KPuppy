import type { Season } from '../api/kinopub'

export interface EpisodeNavigationTarget {
  season: number
  episode: number
}

export interface EpisodeNeighbors {
  previousEpisode?: EpisodeNavigationTarget
  nextEpisode?: EpisodeNavigationTarget
}

/** Resolve adjacent episodes across season boundaries without mutating API data. */
export function getEpisodeNeighbors(
  seasons: Season[] | undefined,
  currentSeason?: number,
  currentEpisode?: number
): EpisodeNeighbors {
  if (!seasons || currentSeason === undefined || currentEpisode === undefined) return {}

  const episodes = [...seasons]
    .sort((a, b) => a.number - b.number)
    .flatMap(season => [...season.episodes]
      .sort((a, b) => a.number - b.number)
      .map(episode => ({ season: season.number, episode: episode.number })))

  const currentIndex = episodes.findIndex(target => (
    target.season === currentSeason && target.episode === currentEpisode
  ))

  if (currentIndex < 0) return {}

  return {
    previousEpisode: currentIndex > 0 ? episodes[currentIndex - 1] : undefined,
    nextEpisode: currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : undefined
  }
}
