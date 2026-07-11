import { describe, it, expect, beforeEach } from 'vitest'
import { getAudioTrackName, saveAudioPreference, getSavedAudioPreference, findAudioIndex } from '../../src/storage'

describe('audio preference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and restores audio preference by item id', () => {
    saveAudioPreference(42, {
      id: 7,
      lang: 'rus',
      type: { title: 'Дубляж' },
      author: { title: 'LostFilm' }
    })

    const saved = getSavedAudioPreference(42)
    expect(saved?.id).toBe(7)
    expect(saved?.name).toContain('LostFilm')
  })

  it('finds audio index by saved id or name', () => {
    const audios = [
      { id: 1, lang: 'eng', type: { title: 'Original' }, author: null },
      { id: 7, lang: 'rus', type: { title: 'Дубляж' }, author: { title: 'LostFilm' } }
    ]
    expect(findAudioIndex(audios, { id: 7, name: getAudioTrackName(audios[1]) })).toBe(1)
    expect(findAudioIndex(audios, { id: 999, name: getAudioTrackName(audios[1]) })).toBe(1)
    expect(findAudioIndex(audios, null)).toBe(0)
  })
})
