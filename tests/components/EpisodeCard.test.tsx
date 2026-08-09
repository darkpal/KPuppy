import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/preact'
import { EpisodeCard } from '../../src/components/EpisodeCard'
import { Episode } from '../../src/api/kinopub'

const episode: Episode = {
  id: 1,
  number: 1,
  title: 'The One with a Broken Thumbnail',
  thumbnail: 'broken.jpg',
  files: [],
  audios: [],
  watched: 0
}

describe('EpisodeCard', () => {
  it('falls back to the series poster when an episode thumbnail is broken', () => {
    const { container } = render(
      <EpisodeCard episode={episode} seriesPoster="friends.jpg" focused={false} />
    )
    const img = container.querySelector('img') as HTMLImageElement

    for (let attempt = 0; attempt < 4; attempt += 1) fireEvent.error(img)

    expect(img.getAttribute('src')).toContain('friends.jpg')
    expect(container.querySelector('.episode-placeholder')).toBeNull()
  })

  it('shows a clean placeholder if the fallback poster also fails', () => {
    const { container } = render(
      <EpisodeCard episode={episode} seriesPoster="friends.jpg" focused={false} />
    )
    const img = container.querySelector('img') as HTMLImageElement

    for (let attempt = 0; attempt < 8; attempt += 1) fireEvent.error(img)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.episode-placeholder-number')?.textContent).toBe('1')
  })
})
