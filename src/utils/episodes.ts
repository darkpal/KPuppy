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
