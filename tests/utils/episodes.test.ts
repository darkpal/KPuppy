import { describe, expect, it } from 'vitest'
import type { Season } from '../../src/api/kinopub'
import { getEpisodeNeighbors } from '../../src/utils/episodes'

function episode(id: number, number: number) {
  return {
    id,
    number,
    title: `Episode ${number}`,
    files: [],
    audios: [],
    watched: 0
  }
}

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
})
